import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { PluginError, PluginFatalError } from '../src/plugins/errors.js'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { getCustomPluginFactory } from './fixtures/get-custom-plugin-factory.js'
import type { Helia } from '@helia/interface'

describe('plugins', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('can override existing plugins', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      plugins: [getCustomPluginFactory({ constructorName: 'DagWalkPlugin', canHandle: () => true, handle: async () => new Response('Hello, world!') })]
    })

    const response = await verifiedFetch.fetch('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    expect(response).to.be.instanceOf(Response)
    expect(response.status).to.equal(200)
    expect(await response.text()).to.equal('Hello, world!')
  })

  it('can shortcut the request pipeline with a PluginFatalError', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      plugins: [getCustomPluginFactory({
        constructorName: 'Whatever',
        canHandle: () => true,
        handle: async () => {
          throw new PluginFatalError('UNKNOWN_ERROR', 'Something went wrong', { response: new Response('Some custom response', { status: 500 }) })
        }
      })]
    })

    const response = await verifiedFetch.fetch('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    expect(response).to.be.instanceOf(Response)
    expect(response.status).to.equal(500)
    expect(await response.text()).to.equal('Some custom response')
  })

  it('should continue to the next plugin when a non-fatal PluginError is thrown', async () => {
    // Create one plugin that throws a non-fatal error and another that returns a valid response.
    const errorPlugin = getCustomPluginFactory({
      constructorName: 'ErrorPlugin',
      canHandle: () => true,
      handle: async () => {
        throw new PluginError('NON_FATAL', 'Non-fatal error')
      }
    })

    const finalPlugin = getCustomPluginFactory({
      constructorName: 'FinalPlugin',
      canHandle: () => true,
      handle: async () => new Response('Final result', { status: 200 })
    })

    verifiedFetch = new VerifiedFetch({ helia }, { plugins: [errorPlugin, finalPlugin] })

    const response = await verifiedFetch.fetch('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    expect(response).to.be.instanceOf(Response)
    expect(response.status).to.equal(200)
    expect(await response.text()).to.equal('Final result')
  })

  it('should perform multiple passes when context is updated', async () => {
    const updaterPlugin = getCustomPluginFactory({
      constructorName: 'UpdaterPlugin',
      canHandle: (context) => context.processed !== true,
      handle: async (context) => {
        // Simulate partial work: update the context and its "modified" property.
        context.processed = true
        context.modified = (context.modified ?? 0) + 1

        return null
      }
    })

    const finalPlugin = getCustomPluginFactory({
      constructorName: 'FinalPlugin',
      // custom context property "processed" is set to true by the updaterPlugin.
      canHandle: (context) => context.processed === true,
      handle: async (context) => new Response('Processed!', { status: 200 })
    })

    verifiedFetch = new VerifiedFetch({ helia }, { plugins: [updaterPlugin, finalPlugin] })

    const response = await verifiedFetch.fetch('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    expect(response).to.be.instanceOf(Response)
    expect(response.status).to.equal(200)
    expect(await response.text()).to.equal('Processed!')
  })

  it('should not call the same plugin twice in a single pipeline run', async () => {
    // Create a plugin that counts its invocations.
    let invocationCount = 0
    const singleCallPlugin = getCustomPluginFactory({
      constructorName: 'SingleCallPlugin',
      canHandle: () => true,
      handle: async (context) => {
        invocationCount++
        context.modified = (context.modified ?? 0) + 1
        return null
      }
    })

    verifiedFetch = new VerifiedFetch({ helia }, { plugins: [singleCallPlugin] })

    // Call fetch. The runPluginPipeline should add the plugin's name to the used set,
    // ensuring it is not invoked more than once.
    await verifiedFetch.fetch('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    expect(invocationCount).to.equal(1)
  })

  it('should exit pipeline after maxPasses if no plugin produces a response', async () => {
    // create a few plugins that do nothing
    let iteration = 0
    const loopingPlugins = Array.from({ length: 5 }, (_, i) => getCustomPluginFactory({
      constructorName: `LoopingPlugin${i}`,
      canHandle: () => {
        return i === iteration
      },
      handle: async (context) => {
        iteration++
        context.modified = (context.modified ?? 0) + 1
        return null
      }
    }))

    verifiedFetch = new VerifiedFetch({ helia }, { plugins: loopingPlugins })

    // With no final response produced after max passes, the fetch method should return a
    // notSupportedResponse (or similar). The content we're requesting here is dag-pb and a dag-cbor accept header, which we don't currently support
    const response = await verifiedFetch.fetch('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr', { headers: { accept: 'application/vnd.ipld.dag-cbor' } })

    expect(response).to.be.instanceOf(Response)
    expect(response.status).to.be.oneOf([501, 404])
    expect(iteration).to.equal(3)
  })
})
