
export function reqResolve(config) {
  return config
}

export function reqReject(error) {
  return Promise.reject(error)
}

export function resResolve(response) {
  return response
}

export function resReject(error) {
  return Promise.reject(error)
}