import { ApiError, patchJson, putJson } from './apiClient';
import { validateNewPassword } from '../utils/passwordValidation';

export async function updatePassword({ password, newPassword }, accessToken) {
  if (!accessToken) { throw new ApiError('Entre novamente para alterar sua senha.', 401); }
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) { throw new ApiError('Confira sua nova senha.', 400, { newPassword: passwordError }); }
  await patchJson('/api/user/update-password', { password, newPassword }, accessToken, {
    headers: { access_token: accessToken },
  });
}

export async function updateUser(values, accessToken) {
  if (!accessToken) { throw new ApiError('Entre novamente para editar seu perfil.', 401); }
  let user;
  try {
    user = await putJson('/api/user/update', {
      name: values.name.trim(), email: values.email.trim().toLowerCase(),
    }, accessToken, {
      headers: { access_token: accessToken },
      conflictMessage: 'Este e-mail já está sendo utilizado.',
    });
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 409) {
      failure.fieldErrors = { ...failure.fieldErrors,
        email: failure.fieldErrors.email || 'Este e-mail já está sendo utilizado.' };
    }
    throw failure;
  }
  if (!user || typeof user.name !== 'string' || typeof user.email !== 'string') {
    throw new Error('A API não retornou os dados atualizados do perfil.');
  }
  return user;
}
