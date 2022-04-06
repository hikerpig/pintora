export const DEMO_BASE_URL = '/demo/'

export const GITHUB_URL = 'https://github.com/hikerpig/pintora'

export const DOC_URL = '/'

export const MIME_TYPES = {
  pintora: 'application/vnd.pintora+text',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  binary: 'application/octet-stream',
} as const

export enum EVENT {
  COPY = 'copy',
  PASTE = 'paste',
  CUT = 'cut',
  KEYDOWN = 'keydown',
  KEYUP = 'keyup',
  MOUSE_MOVE = 'mousemove',
  RESIZE = 'resize',
  UNLOAD = 'unload',
  FOCUS = 'focus',
  BLUR = 'blur',
  DRAG_OVER = 'dragover',
  DROP = 'drop',
  GESTURE_END = 'gestureend',
  BEFORE_UNLOAD = 'beforeunload',
  GESTURE_START = 'gesturestart',
  GESTURE_CHANGE = 'gesturechange',
  POINTER_MOVE = 'pointermove',
  POINTER_UP = 'pointerup',
  STATE_CHANGE = 'statechange',
  WHEEL = 'wheel',
  TOUCH_START = 'touchstart',
  TOUCH_END = 'touchend',
  HASHCHANGE = 'hashchange',
  VISIBILITY_CHANGE = 'visibilitychange',
  SCROLL = 'scroll',
}
