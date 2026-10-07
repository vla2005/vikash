import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import ProfileFormLayout, { profileFormStyles as s } from '../components/ProfileFormLayout';
import FormField from '../components/FormField';
import useProfileForm from '../hooks/useProfileForm';
import { getProfileInitials } from '../utils/profile';
import { validateProfile } from '../utils/profileValidation';
import { colors, fontFamily, fontFamilyBold } from '../theme';

export default function EditProfileScreen({ profile, onBack, onSave }) {
  const emailRef = useRef(null);
  const form = useProfileForm({
    initialValues: { name: profile?.name || '', email: profile?.email || '', password: '' },
    validate: values => validateProfile(values, profile?.email || ''),
    toRequest: values => ({ name: values.name.trim(), email: values.email.trim(),
      ...(values.password ? { password: values.password } : {}) }),
    onSave, onSaved: onBack,
    successMessage: 'Perfil atualizado.', unavailableMessage: 'A edição do perfil estará disponível em breve.',
    errorMessage: 'Não foi possível atualizar seu perfil. Tente novamente.',
  });
  const { values, errors, saving, change, submit } = form;
  const emailChanged = values.email.trim().toLowerCase() !== (profile?.email || '').trim().toLowerCase();
  return <ProfileFormLayout title="Editar perfil" submitText="Salvar alterações" onSubmit={submit} onBack={onBack} saving={saving} error={form.requestError} notice="Suas alterações serão usadas em todo o app.">
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Do seu jeito.</Text><Text style={s.subtitle}>Mantenha seus dados atualizados.</Text></View>
    <View style={styles.identity}>
      <View accessible={false} style={styles.avatar}><Text style={styles.initials}>{getProfileInitials(values.name)}</Text></View>
      <View style={styles.copy}><Text style={styles.name}>{values.name.trim() || 'Seu nome'}</Text><Text style={styles.subtitle}>Seu perfil no Vikash</Text></View>
    </View>
    <View style={s.fields}>
      <FormField label="Nome completo" value={values.name} onChangeText={value => change('name', value)} error={errors.name} placeholder="Como você se chama?" editable={!saving} maxLength={100} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} inputContainerStyle={s.input} testID="profile-name" />
      <FormField ref={emailRef} label="E-mail" value={values.email} onChangeText={value => change('email', value)} error={errors.email} placeholder="seu@email.com" hint="Use um e-mail que você acessa com frequência." editable={!saving} maxLength={150} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="done" onSubmitEditing={submit} inputContainerStyle={s.input} leadingIcon={<EnvelopeSimple size={22} color={colors.secondary} />} testID="profile-email" />
      {(emailChanged || errors.password || values.password) && <FormField label="Senha atual" password value={values.password} onChangeText={value => change('password', value)} error={errors.password} placeholder="Confirme sua senha" hint="Para sua segurança, confirme a senha ao alterar seu e-mail." editable={!saving} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={submit} inputContainerStyle={s.input} testID="profile-password" />}
    </View>
  </ProfileFormLayout>;
}

const styles = StyleSheet.create({
  identity: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#DCE3FF', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 32, color: colors.text, letterSpacing: -1 },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 22, lineHeight: 29, color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontFamily, fontSize: 15, lineHeight: 23, color: colors.secondary },
});
