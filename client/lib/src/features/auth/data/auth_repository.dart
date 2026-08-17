import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_store.dart';
import 'auth_models.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokenStore);

  final ApiClient _api;
  final TokenStore _tokenStore;

  Future<AuthSession> login({required String username, required String password}) async {
    final json = await _api.postJson('/auth/web/login', {
      'username': username,
      'password': password,
    }, allowRefresh: false);
    final session = AuthSession.fromJson(json);
    await _tokenStore.save(TokenPair(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    ));
    return session;
  }

  Future<AuthSession> register({required String username, required String password}) async {
    final json = await _api.postJson('/auth/web/register', {
      'username': username,
      'password': password,
    }, allowRefresh: false);
    final session = AuthSession.fromJson(json);
    await _tokenStore.save(TokenPair(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    ));
    return session;
  }

  Future<AuthUser> profile() async {
    final json = await _api.getJson('/auth/profile');
    return AuthUser.fromJson(json);
  }

  Future<AuthUser?> restoreSessionFromWebCookie() async {
    try {
      final json = await _api.postJson('/auth/web/refresh', const {}, allowRefresh: false);
      final tokens = json['tokens'];
      if (tokens is! Map<String, dynamic>) return null;
      final accessToken = tokens['accessToken'];
      if (accessToken is! String || accessToken.isEmpty) return null;

      await _tokenStore.save(TokenPair(accessToken: accessToken, refreshToken: null));
      return profile();
    } catch (_) {
      await _tokenStore.clear();
      return null;
    }
  }

  Future<void> logout() async {
    await _api.postJson('/auth/web/logout', const {}, allowRefresh: false);
    await _tokenStore.clear();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider), ref.watch(tokenStoreProvider));
});
