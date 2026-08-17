import 'package:flutter/material.dart';

ThemeData buildAppTheme() {
  const seed = Color(0xFF3E8F55);
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: seed),
    useMaterial3: true,
    scaffoldBackgroundColor: const Color(0xFFF7FAF5),
    appBarTheme: const AppBarTheme(centerTitle: false),
    cardTheme: const CardThemeData(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
  );
}
