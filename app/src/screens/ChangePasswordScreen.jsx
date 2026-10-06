import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Key } from 'phosphor-react-native/src/icons/Key';
import ProfileFormLayout, { profileFormStyles as s } from '../components/ProfileFormLayout';
import FormField from '../components/FormField';
import useProfileForm from '../hooks/useProfileForm';
import useToast from '../hooks/useToast';
import { validatePasswordChange } from '../utils/profileValidation';
import { colors, fontFamilyMedium } from '../theme';

export default function ChangePasswordScreen({ onBack, onSave, onForgotPassword }) {
  const newPasswordRef = useRef(null);
  const confirmRef = useRef(null);
  const { showToast } = useToast();
  const form = useProfileForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: validatePasswordChange,
    toRequest: values => ({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    onSave, onSaved: onBack,
    successMessage: 'Senha alterada.', unavailableMessage: 'A alteração de senha estará disponível em breve.',
  });
  const { values, errors, saving, change, submit } = form;
  function forgotPassword() {
    if (onForgotPassword) { onForgotPassword(); }
    else { showToast({ type: 'info', message: 'A recuperação de senha estará disponível em breve.' }); }
  }
  return <ProfileFormLayout title="Alterar senha" submitText="Salvar nova senha" onSubmit={submit} onBack={onBack} saving={saving} error={form.requestError} secure notice="Você precisará usar a nova senha no próximo acesso.">
    <View style={styles.symbol} accessible={false}><Key size={34} color={colors.text} /></View>
    <View style={styles.heading}><Text accessibilityRole="header" style={s.title}>Uma nova senha.</Text><Text style={s.subtitle}>Proteja o acesso à sua conta.</Text></View>
    <View style={styles.fields}>
      <View>
        <FormField label="Senha atual" password value={values.currentPassword} onChangeText={value => change('currentPassword', value)} error={errors.currentPassword} placeholder="Digite sua senha atual" editable={!saving} maxLength={100} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="next" onSubmitEditing={() => newPasswordRef.current?.focus()} inputContainerStyle={s.input} testID="password-current" />
        <Pressable accessibilityRole="button" accessibilityLabel="Esqueci minha senha" disabled={saving} onPress={forgotPassword} style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}><Text style={styles.forgotText}>Esqueci minha senha</Text></Pressable>
      </View>
      <FormField ref={newPasswordRef} label="Nova senha" password value={values.newPassword} onChangeText={value => change('newPassword', value)} error={errors.newPassword} hint="Use pelo menos 8 caracteres." placeholder="Crie sua nova senha" editable={!saving} maxLength={72} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} inputContainerStyle={s.input} testID="password-new" />
      <FormField ref={confirmRef} label="Confirmar nova senha" password value={values.confirmPassword} onChangeText={value => change('confirmPassword', value)} error={errors.confirmPassword} placeholder="Repita sua nova senha" editable={!saving} maxLength={72} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={submit} inputContainerStyle={s.input} testID="password-confirm" />
    </View>
  </ProfileFormLayout>;
}

const styles = StyleSheet.create({
  symbol: { marginTop: 20, width: 60, height: 60, backgroundColor: '#DCE3FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: 10, gap: 7 },
  fields: { marginTop: 22, gap: 14 },
  forgot: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' },
  forgotText: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.primary },
  pressed: { opacity: 0.72 },
});
