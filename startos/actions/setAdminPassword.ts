import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { adminUsername, uiPort } from '../utils'
import { requireNoStorageCopy } from '../storageGuard'

const api = `http://127.0.0.1:${uiPort}/api`

async function csrf() {
  const res = await fetch(`${api}/heartbeat`).catch(() => {
    throw new Error(i18n('RomM did not answer.'))
  })
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const token = /csrftoken=([^;]+)/.exec(cookie)?.[1]
  if (!token) throw new Error(i18n('RomM did not answer.'))
  return { cookie, token }
}

async function rotate(current: string, next: string) {
  const { cookie, token } = await csrf()
  const auth = `Basic ${Buffer.from(`${adminUsername}:${current}`).toString('base64')}`

  const me = await fetch(`${api}/users/me`, {
    headers: { Authorization: auth, Cookie: cookie },
  })
  if (!me.ok) {
    throw new Error(
      i18n(
        'RomM rejected the saved password, so it cannot be changed from here. Change it from your profile inside RomM instead.',
      ),
    )
  }
  const { id } = await me.json()

  const body = new FormData()
  body.set('password', next)
  const changed = await fetch(`${api}/users/${id}`, {
    method: 'PUT',
    headers: { Authorization: auth, Cookie: cookie, 'x-csrftoken': token },
    body,
  })
  if (!changed.ok) throw new Error(i18n('RomM refused the new password.'))
}

export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  async ({ effects }) => {
    const saved = await storeJson.read().const(effects)
    const first = !saved?.adminPassword
    return {
      name: i18n('Set Admin Password'),
      description: first
        ? i18n(
            'Generate the password for the RomM admin account. RomM creates the account with it the first time it starts.',
          )
        : i18n(
            'Generate a new password for the RomM admin account and apply it.',
          ),
      warning: first
        ? null
        : i18n('Every signed-in RomM session ends immediately.'),
      allowedStatuses: first ? 'only-stopped' : 'only-running',
      group: null,
      visibility: 'enabled',
    }
  },

  async ({ effects }) => {
    await requireNoStorageCopy()
    const saved = await storeJson.read().once()
    const adminPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })

    if (saved?.adminPassword) await rotate(saved.adminPassword, adminPassword)
    await storeJson.merge(effects, { adminPassword })

    return {
      version: '1',
      title: i18n('RomM Admin Password'),
      message: i18n(
        'Save this password — it is shown once, and running this action again replaces it.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: adminUsername,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: adminPassword,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
