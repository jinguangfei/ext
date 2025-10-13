import { DatabaseClient } from '@shared/db-utils.js'

const TOKEN_CODE = 'access_token'

export async function getToken() {
  return await DatabaseClient.get(TOKEN_CODE)
}

export async function setToken(token) {
  await DatabaseClient.set(TOKEN_CODE, token)
}

export async function removeToken() {
  await DatabaseClient.delete(TOKEN_CODE)
}