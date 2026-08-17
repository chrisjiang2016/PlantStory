import 'package:dio/dio.dart';
import 'package:dio/browser.dart';

/// Enables browser cookies for cross-origin API calls on Flutter Web.
///
/// Required by `/auth/web/*`: refresh token lives in HttpOnly cookie and must be
/// sent by the browser automatically. Non-Web builds use the stub implementation.
void configureCookieCredentials(Dio dio) {
  final adapter = dio.httpClientAdapter;
  if (adapter is BrowserHttpClientAdapter) {
    adapter.withCredentials = true;
  }
}
