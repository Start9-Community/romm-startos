import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'

export async function requireNoStorageCopy() {
  if ((await storeJson.read().once())?.storageMigration)
    throw new Error(
      i18n('Finish or cancel the library copy before changing settings.'),
    )
}
