import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:maresi_mobile/navigation/auth_navigation.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/screens/registration_flow_screen.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:provider/provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.popOnSuccess = false});

  /// When true, pops with `true` after login instead of navigating home.
  final bool popOnSuccess;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  String _cleanError(Object error) {
    final text = error.toString();
    if (text.startsWith('Exception: ')) return text.substring(11);
    return text;
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || !email.contains('@')) {
      _showMessage(locale.t('auth.errorEmail'));
      return;
    }
    if (password.length < 6) {
      _showMessage(locale.t('auth.errorPassword'));
      return;
    }

    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().login(
            email: email,
            password: password,
          );
      if (mounted) {
        if (widget.popOnSuccess) {
          Navigator.of(context).pop(true);
        } else {
          goHomeAfterAuth(context);
        }
      }
    } catch (e) {
      if (mounted) _showMessage(_cleanError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final overlayStyle = Theme.of(context).brightness == Brightness.dark
        ? SystemUiOverlayStyle.light
        : SystemUiOverlayStyle.dark;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlayStyle,
      child: Scaffold(
        backgroundColor: palette.surface,
        appBar: AppBar(
          backgroundColor: palette.surface,
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back, color: palette.text),
            onPressed: _loading ? null : () => Navigator.of(context).pop(),
          ),
        ),
        body: SafeArea(
          top: false,
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  children: [
                    Text(
                      'Maresi',
                      style: TextStyle(
                        fontSize: 42,
                        fontWeight: FontWeight.w800,
                        fontStyle: FontStyle.italic,
                        color: AppColors.primary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      locale.t('auth.subtitle'),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: palette.textSecondary, fontSize: 16),
                    ),
                    const SizedBox(height: 28),
                    _LabeledField(
                      label: locale.t('auth.emailLabel'),
                      child: TextField(
                        controller: _emailController,
                        enabled: !_loading,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        decoration: InputDecoration(hintText: locale.t('auth.emailHint')),
                        onSubmitted: (_) => _submit(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _LabeledField(
                      label: locale.t('auth.passwordLabel'),
                      child: TextField(
                        controller: _passwordController,
                        enabled: !_loading,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          hintText: locale.t('auth.passwordHint'),
                          suffixIcon: IconButton(
                            onPressed: _loading ? null : () => setState(() => _obscurePassword = !_obscurePassword),
                            icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          ),
                        ),
                        onSubmitted: (_) => _submit(),
                      ),
                    ),
                    const SizedBox(height: 28),
                    ImmoGradientButton(
                      label: locale.t('auth.signIn'),
                      loading: _loading,
                      onPressed: _loading ? null : _submit,
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () => Navigator.of(context).push(
                                MaterialPageRoute<void>(builder: (_) => const RegistrationFlowScreen()),
                              ),
                      child: Text(
                        locale.t('auth.noAccount'),
                        style: const TextStyle(color: AppColors.accent),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: palette.text)),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}
