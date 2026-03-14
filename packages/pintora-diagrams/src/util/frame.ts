import { FrameBorderStyle, FrameCornerStyle, FrameFamily, FrameKind, MarkSemantic } from '@pintora/core'

export type FrameDescriptor = {
  family: FrameFamily
  kind: FrameKind
  borderStyle: FrameBorderStyle
  cornerStyle?: FrameCornerStyle
  compact?: boolean
}

export function makeFrameSemantic(descriptor: FrameDescriptor, base: Partial<MarkSemantic> = {}): MarkSemantic {
  return {
    ...base,
    frame: {
      family: descriptor.family,
      kind: descriptor.kind,
      compact: descriptor.compact ?? true,
      borderStyle: descriptor.borderStyle,
      cornerStyle: descriptor.cornerStyle,
    },
  }
}
