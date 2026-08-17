import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenPair {
  const TokenPair({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String? refreshToken;
}

abstract class TokenStore {
  Future<TokenPair?> read();
  Future<void> save(TokenPair pair);
  Future<void> clear();
}

/// In-memory storage used by Web and tests.
///
/// Web refresh tokens remain in the server-managed HttpOnly cookie. This store
/// intentionally does not persist credentials in localStorage/sessionStorage.
class MemoryTokenStore implements TokenStore {
  TokenPair? _tokens;

  @override
  Future<TokenPair?> read() async => _tokens;

  @override
  Future<void> save(TokenPair pair) async {
    _tokens = pair;
  }

  @override
  Future<void> clear() async {
    _tokens = null;
  }
}

/// Native secure storage for Android/iOS access-token persistence.
///
/// The native app still receives refresh tokens through the API contract only
/// when a native auth flow is enabled. Web uses HttpOnly cookies and never
/// reaches this implementation.
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _accessTokenKey = 'plant_story.access_token';
  static const _refreshTokenKey = 'plant_story.refresh_token';

  final FlutterSecureStorage _storage;

  @override
  Future<TokenPair?> read() async {
    final accessToken = await _storage.read(key: _accessTokenKey);
    if (accessToken == null || accessToken.isEmpty) return null;
    return TokenPair(
      accessToken: accessToken,
      refreshToken: await _storage.read(key: _refreshTokenKey),
    );
  }

  @override
  Future<void> save(TokenPair pair) async {
    await _storage.write(key: _accessTokenKey, value: pair.accessToken);
    if (pair.refreshToken == null || pair.refreshToken!.isEmpty) {
      await _storage.delete(key: _refreshTokenKey);
    } else {
      await _storage.write(key: _refreshTokenKey, value: pair.refreshToken);
    }
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}

TokenStore createPlatformTokenStore() {
  // Flutter Web has the HttpOnly-cookie flow. Keeping this branch explicit
  // prevents accidental credential persistence in browser storage.
  if (kIsWeb ||
      (defaultTargetPlatform != TargetPlatform.android &&
          defaultTargetPlatform != TargetPlatform.iOS)) {
    return MemoryTokenStore();
  }
  return SecureTokenStore();
}
