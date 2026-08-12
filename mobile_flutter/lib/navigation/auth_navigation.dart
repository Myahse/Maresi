import 'package:flutter/material.dart';

/// Clears auth stack and returns to [AppNavigator], which shows home when signed in.
void goHomeAfterAuth(BuildContext context) {
  Navigator.of(context).popUntil((route) => route.isFirst);
}
