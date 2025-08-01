import { CanceledError, retry, RetryableError } from 'state/activity/polling/retry'

describe('retry', () => {
  // eslint-disable-next-line max-params
  function makeFn<T>(fails: number, result: T, retryable = true): () => Promise<T> {
    return async () => {
      if (fails > 0) {
        fails--
        throw retryable ? new RetryableError('failure') : new Error('bad failure')
      }
      return result
    }
  }

  it('fails for non-retryable error', async () => {
    await expect(retry(makeFn(1, 'abc', false), { n: 3, maxWait: 0, medWait: 0, minWait: 0 }).promise).rejects.toThrow(
      'bad failure',
    )
  })

  it('works after one fail', async () => {
    await expect(retry(makeFn(1, 'abc'), { n: 3, maxWait: 0, medWait: 0, minWait: 0 }).promise).resolves.toEqual('abc')
  })

  it('works after two fails', async () => {
    await expect(retry(makeFn(2, 'abc'), { n: 3, maxWait: 0, medWait: 0, minWait: 0 }).promise).resolves.toEqual('abc')
  })

  it('throws if too many fails', async () => {
    await expect(retry(makeFn(4, 'abc'), { n: 3, maxWait: 0, medWait: 0, minWait: 0 }).promise).rejects.toThrow(
      'failure',
    )
  })

  it('cancel causes promise to reject', async () => {
    const { promise, cancel } = retry(makeFn(2, 'abc'), { n: 3, minWait: 100, medWait: 100, maxWait: 100 })
    cancel()
    await expect(promise).rejects.toThrow(expect.any(CanceledError))
  })

  it('cancel no-op after complete', async () => {
    const { promise, cancel } = retry(makeFn(0, 'abc'), { n: 3, minWait: 100, medWait: 100, maxWait: 100 })
    // defer
    setTimeout(cancel, 0)
    await expect(promise).resolves.toEqual('abc')
  })
})
