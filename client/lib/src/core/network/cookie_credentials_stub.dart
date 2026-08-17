import 'package:dio/dio.dart';

/// No-op outside Flutter Web. Native clients should use platform secure storage
/// instead of browser cookies.
void configureCookieCredentials(Dio dio) {}
