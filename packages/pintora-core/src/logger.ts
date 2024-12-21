export const LEVELS = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
}

export const logger = {
  debug: (...args: any[]) => {},
  info: (...args: any[]) => {},
  warn: (...args: any[]) => {},
  error: (...args: any[]) => {},
  fatal: (...args: any[]) => {},
}

export const setLogLevel = function (input: string | number = 'fatal') {
  let level: number = LEVELS.fatal
  if (typeof input === 'string') {
    const k = input.toLowerCase()
    if (k in LEVELS) {
      level = (LEVELS as any)[k]
    }
  }
  logger.debug = () => {}
  logger.info = () => {}
  logger.warn = () => {}
  logger.error = () => {}
  logger.fatal = () => {}
  if (level <= LEVELS.fatal) {
    logger.fatal = console.error
      ? console.error.bind(console, format('FATAL'), 'color: orange')
      : console.log.bind(console, '\x1b[35m', format('FATAL'))
  }
  if (level <= LEVELS.error) {
    logger.error = console.error
      ? console.error.bind(console, format('ERROR'), 'color: orange')
      : console.log.bind(console, '\x1b[31m', format('ERROR'))
  }
  if (level <= LEVELS.warn) {
    logger.warn = console.warn
      ? console.warn.bind(console, format('WARN'), 'color: orange')
      : console.log.bind(console, `\x1b[33m`, format('WARN'))
  }
  if (level <= LEVELS.info) {
    logger.info = console.info // ? console.info.bind(console, '\x1b[34m', format('INFO'), 'color: blue')
      ? console.info.bind(console, format('INFO'), 'color: lightblue')
      : console.log.bind(console, '\x1b[34m', format('INFO'))
  }
  if (level <= LEVELS.debug) {
    logger.debug = console.debug
      ? console.debug.bind(console, format('DEBUG'), 'color: lightgreen')
      : console.log.bind(console, '\x1b[32m', format('DEBUG'))
  }
}

const format = (level: any) => {
  // const d = new Date()
  // const time = `${d.getSeconds()}.${d.getMilliseconds()}`
  // return `%c${time} : ${level} : `
  return `%c${level}: `
}
