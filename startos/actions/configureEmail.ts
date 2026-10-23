import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { requireNoStorageCopy } from '../utils'

const { InputSpec, Value, Variants } = sdk

export const inputSpec = InputSpec.of({
  smtp: Value.union({
    name: i18n('Email'),
    description: i18n(
      'Lets RomM send password-reset links and notifications through your SMTP server.',
    ),
    default: 'disabled',
    variants: Variants.of({
      disabled: { name: i18n('Disabled'), spec: InputSpec.of({}) },
      enabled: {
        name: i18n('Enabled'),
        spec: InputSpec.of({
          host: Value.text({
            name: i18n('SMTP Host'),
            description: null,
            required: true,
            default: null,
          }),
          port: Value.number({
            name: i18n('SMTP Port'),
            description: null,
            required: true,
            default: 587,
            integer: true,
            min: 1,
            max: 65535,
          }),
          security: Value.select({
            name: i18n('Security'),
            default: 'starttls',
            values: {
              starttls: i18n('STARTTLS (usually port 587)'),
              tls: i18n('Implicit TLS (usually port 465)'),
              none: i18n('None'),
            },
          }),
          username: Value.text({
            name: i18n('Username'),
            description: null,
            required: false,
            default: null,
          }),
          password: Value.text({
            name: i18n('Password'),
            description: null,
            required: false,
            default: null,
            masked: true,
          }),
          from: Value.text({
            name: i18n('Sender Address'),
            description: i18n('The From address on every email RomM sends.'),
            required: true,
            default: null,
            placeholder: 'romm@example.com',
          }),
        }),
      },
    }),
  }),
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

  async () => ({ smtp: (await storeJson.read().once())?.smtp ?? undefined }),

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
