import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/api_config.dart';
import '../storage/token_store.dart';
import 'api_exception.dart';
import 'cookie_credentials_stub.dart'
    if (dart.library.js_interop) 'cookie_credentials_web.dart';

final tokenStoreProvider = Provider<TokenStore>(
  (ref) => createPlatformTokenStore(),
);

final dioProvider = Provider<Dio>(
  (ref) => createConfiguredDio(ref.watch(tokenStoreProvider)),
);

Dio createConfiguredDio(TokenStore tokenStore) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    ),
  );
  configureCookieCredentials(dio);

  var isRefreshing = false;

  Future<bool> refreshAccessToken() async {
    if (isRefreshing) return false;
    isRefreshing = true;
    try {
      final response = await dio.post<dynamic>(
        '/auth/web/refresh',
        options: Options(extra: {'skipAuthRefresh': true}),
      );
      final data = response.data;
      if (data is! Map<String, dynamic>) return false;
      final tokens = data['tokens'];
      if (tokens is! Map<String, dynamic>) return false;
      final accessToken = tokens['accessToken'];
      if (accessToken is! String || accessToken.isEmpty) return false;
      await tokenStore.save(
        TokenPair(accessToken: accessToken, refreshToken: null),
      );
      return true;
    } on DioException {
      await tokenStore.clear();
      return false;
    } finally {
      isRefreshing = false;
    }
  }

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final tokens = await tokenStore.read();
        if (tokens != null) {
          options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final requestOptions = error.requestOptions;
        final shouldRefresh =
            error.response?.statusCode == 401 &&
            requestOptions.extra['skipAuthRefresh'] != true &&
            requestOptions.extra['hasRetriedAfterRefresh'] != true;

        if (shouldRefresh && await refreshAccessToken()) {
          final tokens = await tokenStore.read();
          final retryOptions = Options(
            method: requestOptions.method,
            headers: Map<String, dynamic>.from(requestOptions.headers)
              ..['Authorization'] = 'Bearer ${tokens!.accessToken}',
            responseType: requestOptions.responseType,
            contentType: requestOptions.contentType,
            followRedirects: requestOptions.followRedirects,
            receiveTimeout: requestOptions.receiveTimeout,
            sendTimeout: requestOptions.sendTimeout,
            extra: {...requestOptions.extra, 'hasRetriedAfterRefresh': true},
          );
          try {
            final response = await dio.request<dynamic>(
              requestOptions.path,
              data: requestOptions.data,
              queryParameters: requestOptions.queryParameters,
              options: retryOptions,
              cancelToken: requestOptions.cancelToken,
              onReceiveProgress: requestOptions.onReceiveProgress,
              onSendProgress: requestOptions.onSendProgress,
            );
            return handler.resolve(response);
          } on DioException catch (retryError) {
            return handler.next(retryError);
          }
        }

        if (error.response?.statusCode == 401) {
          await tokenStore.clear();
        }
        handler.next(error);
      },
    ),
  );

  return dio;
}

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final response = await _guard(
      () => _dio.get<dynamic>(path, queryParameters: query),
    );
    return _asMap(response.data);
  }

  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final response = await _guard(
      () => _dio.get<dynamic>(path, queryParameters: query),
    );
    final data = response.data;
    if (data is List) return data;
    throw const ApiException(message: '接口返回格式错误');
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body, {
    bool allowRefresh = true,
  }) async {
    final response = await _guard(
      () => _dio.post<dynamic>(
        path,
        data: body,
        options: Options(extra: {if (!allowRefresh) 'skipAuthRefresh': true}),
      ),
    );
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> patchJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await _guard(() => _dio.patch<dynamic>(path, data: body));
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> deleteJson(String path) async {
    final response = await _guard(() => _dio.delete<dynamic>(path));
    return _asMap(response.data);
  }

  Future<Response<dynamic>> _guard(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      return await request();
    } on DioException catch (error) {
      final data = error.response?.data;
      final message = data is Map<String, dynamic>
          ? data['message']?.toString() ?? '请求失败'
          : error.message ?? '网络异常';
      throw ApiException(
        message: message,
        statusCode: error.response?.statusCode,
      );
    }
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    throw const ApiException(message: '接口返回格式错误');
  }
}

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(ref.watch(dioProvider)),
);
