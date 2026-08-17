/// Runtime API configuration.
///
/// Use --dart-define=API_BASE_URL=http://localhost:3000/api/v1 for local web.
/// Android emulator should use http://10.0.2.2:3000/api/v1.
class ApiConfig {
  const ApiConfig._();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );
}
