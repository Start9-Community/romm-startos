import { smtpPrefill } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { requireNoStorageCopy } from '../utils'

export const inputSpec = sdk.InputSpec.of({
  smtp: sdk.inputSpecConstants.smtpInputSpec,
})

export const configureEmail = sdk.Action.withInput(
  'configure-email',

  async () => ({
    name: i18n('Configure Email'),
    description: i18n(
      'Connect RomM to an SMTP server so it can email password-reset links and notifications.',
    ),
    warning: i18n('Saving restarts RomM.'),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => ({
    smtp: smtpPrefill(await storeJson.read((s) => s.smtp).once()),
  }),

  async ({ effects, input }) => {
    await requireNoStorageCopy()
    await storeJson.merge(effects, input)

    return {
      version: '1',
      title: i18n('Email Settings Saved'),
      message: i18n('RomM is restarting with the email settings you saved.'),
      result: null,
    }
  },
)
