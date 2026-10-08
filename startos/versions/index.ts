import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v5_2_0_0 } from './v5.2.0_0'
import { v5_3_0_0 } from './v5.3.0_0'

export const versionGraph = VersionGraph.of({
  current,
  other: [v5_2_0_0, v5_3_0_0],
})
