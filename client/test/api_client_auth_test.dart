import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:plant_story/src/core/network/api_client.dart';
import 'package:plant_story/src/core/network/api_exception.dart';
import 'package:plant_story/src/core/storage/token_store.dart';
import 'package:plant_story/src/features/auth/data/auth_repository.dart';

void main() {
  test('web login stores access token without JSON refresh token', () async {
    final adapter = _FakeAdapter((options, index) {
      expect(options.path, '/auth/web/login');
      expect(options.extra['skipAuthRefresh'], isTrue);
      return _jsonResponse(200, {
        'user': {'id': '1', 'username': 'webuser'},
        'tokens': {'accessToken': 'access-v1', 'expiresIn': 900},
      });
    });
    final tokenStore = MemoryTokenStore();
    final repository = AuthRepository(_api(adapter, tokenStore), tokenStore);

    final session = await repository.login(username: 'webuser', password: 'pass123456');
    final stored = await tokenStore.read();

    expect(session.user.username, 'webuser');
    expect(session.accessToken, 'access-v1');
    expect(session.refreshToken, isNull);
    expect(stored?.accessToken, 'access-v1');
    expect(stored?.refreshToken, isNull);
  });

  test('web register stores access token without JSON refresh token', () async {
    final adapter = _FakeAdapter((options, index) {
      expect(options.path, '/auth/web/register');
      expect(options.extra['skipAuthRefresh'], isTrue);
      return _jsonResponse(200, {
        'user': {'id': '2', 'username': 'newweb'},
        'tokens': {'accessToken': 'access-register', 'expiresIn': 900},
      });
    });
    final tokenStore = MemoryTokenStore();
    final repository = AuthRepository(_api(adapter, tokenStore), tokenStore);

    final session = await repository.register(username: 'newweb', password: 'pass123456');
    final stored = await tokenStore.read();

    expect(session.user.username, 'newweb');
    expect(session.refreshToken, isNull);
    expect(stored?.accessToken, 'access-register');
    expect(stored?.refreshToken, isNull);
  });

  test('401 business request refreshes access token from web cookie endpoint and retries once', () async {
    final adapter = _FakeAdapter((options, index) {
      if (index == 1) {
        expect(options.path, '/garden/plants');
        expect(options.headers['Authorization'], 'Bearer expired-access');
        return _jsonResponse(401, {'message': 'token expired'});
      }
      if (index == 2) {
        expect(options.path, '/auth/web/refresh');
        expect(options.extra['skipAuthRefresh'], isTrue);
        return _jsonResponse(200, {
          'tokens': {'accessToken': 'fresh-access', 'expiresIn': 900},
        });
      }
      expect(options.path, '/garden/plants');
      expect(options.headers['Authorization'], 'Bearer fresh-access');
      return _jsonResponse(200, [
        {
          'id': '4',
          'nickname': 'Sprint F 绿萝',
          'location': 'Web 联调台',
          'currentStage': 'growing',
          'species': {'id': '1', 'name': '绿萝'},
        },
      ]);
    });
    final tokenStore = MemoryTokenStore();
    await tokenStore.save(const TokenPair(accessToken: 'expired-access', refreshToken: null));
    final api = _api(adapter, tokenStore);

    final plants = await api.getList('/garden/plants');
    final stored = await tokenStore.read();

    expect(plants, hasLength(1));
    expect(stored?.accessToken, 'fresh-access');
    expect(adapter.requestCount, 3);
  });

  test('refresh failure clears in-memory access token and surfaces 401 ApiException', () async {
    final adapter = _FakeAdapter((options, index) {
      if (index == 1) return _jsonResponse(401, {'message': 'token expired'});
      expect(options.path, '/auth/web/refresh');
      return _jsonResponse(401, {'message': 'refresh_token 已失效'});
    });
    final tokenStore = MemoryTokenStore();
    await tokenStore.save(const TokenPair(accessToken: 'expired-access', refreshToken: null));
    final api = _api(adapter, tokenStore);

    await expectLater(api.getList('/garden/plants'), throwsA(isA<ApiException>()));
    expect(await tokenStore.read(), isNull);
    expect(adapter.requestCount, 2);
  });

  test('web logout calls cookie logout endpoint and clears in-memory token', () async {
    final adapter = _FakeAdapter((options, index) {
      expect(options.path, '/auth/web/logout');
      expect(options.extra['skipAuthRefresh'], isTrue);
      return _jsonResponse(200, {'message': '退出成功'});
    });
    final tokenStore = MemoryTokenStore();
    await tokenStore.save(const TokenPair(accessToken: 'access-v1', refreshToken: null));
    final repository = AuthRepository(_api(adapter, tokenStore), tokenStore);

    await repository.logout();

    expect(await tokenStore.read(), isNull);
  });

  test('restoreSessionFromWebCookie refreshes access token and loads profile', () async {
    final adapter = _FakeAdapter((options, index) {
      if (index == 1) {
        expect(options.path, '/auth/web/refresh');
        expect(options.extra['skipAuthRefresh'], isTrue);
        return _jsonResponse(200, {
          'tokens': {'accessToken': 'restored-access', 'expiresIn': 900},
        });
      }

      expect(options.path, '/auth/profile');
      expect(options.headers['Authorization'], 'Bearer restored-access');
      return _jsonResponse(200, {
        'id': '8',
        'username': 'restored-web',
        'nickname': 'restored-web',
      });
    });
    final tokenStore = MemoryTokenStore();
    final repository = AuthRepository(_api(adapter, tokenStore), tokenStore);

    final user = await repository.restoreSessionFromWebCookie();
    final stored = await tokenStore.read();

    expect(user?.username, 'restored-web');
    expect(stored?.accessToken, 'restored-access');
    expect(stored?.refreshToken, isNull);
    expect(adapter.requestCount, 2);
  });

  test('restoreSessionFromWebCookie clears token and returns null on refresh failure', () async {
    final adapter = _FakeAdapter((options, index) {
      expect(options.path, '/auth/web/refresh');
      expect(options.extra['skipAuthRefresh'], isTrue);
      return _jsonResponse(401, {'message': 'refresh_token 缺失'});
    });
    final tokenStore = MemoryTokenStore();
    await tokenStore.save(const TokenPair(accessToken: 'stale-access', refreshToken: null));
    final repository = AuthRepository(_api(adapter, tokenStore), tokenStore);

    final user = await repository.restoreSessionFromWebCookie();

    expect(user, isNull);
    expect(await tokenStore.read(), isNull);
    expect(adapter.requestCount, 1);
  });
}

ApiClient _api(_FakeAdapter adapter, TokenStore tokenStore) {
  final dio = createConfiguredDio(tokenStore);
  dio.httpClientAdapter = adapter;
  return ApiClient(dio);
}

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.handler);

  final ResponseBody Function(RequestOptions options, int index) handler;
  int requestCount = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requestCount += 1;
    return handler(options, requestCount);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonResponse(int statusCode, Object body) {
  return ResponseBody.fromString(
    jsonEncode(body),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}
