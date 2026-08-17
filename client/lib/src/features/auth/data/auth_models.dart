class AuthUser {
  const AuthUser({
    required this.id,
    required this.username,
    this.nickname,
    this.avatarUrl,
  });

  final String id;
  final String username;
  final String? nickname;
  final String? avatarUrl;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'].toString(),
      username: json['username'] as String,
      nickname: json['nickname'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}

class AuthSession {
  const AuthSession({required this.user, required this.accessToken, required this.refreshToken});

  final AuthUser user;
  final String accessToken;
  final String? refreshToken;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final tokens = json['tokens'] as Map<String, dynamic>;
    return AuthSession(
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      accessToken: tokens['accessToken'] as String,
      refreshToken: tokens['refreshToken'] as String?,
    );
  }
}
