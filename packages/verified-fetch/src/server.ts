import express from 'express'
import { traceFunction } from '@libp2p/opentelemetry-metrics'
import { getLibp2pConfig } from './utils/libp2p-defaults' // Adjust the import path as needed

const app = express()

// Middleware to add server-timing headers
app.use((req, res, next) => {
  const traceSpan = traceFunction('request-handling')

  res.on('finish', () => {
    const traceData = traceSpan.end()
    const serverTiming = traceData.map(({ name, duration }) => `${name};dur=${duration}`).join(', ')
    res.setHeader('Server-Timing', serverTiming)
  })

  next()
})

app.get('/', (req, res) => {
  res.send('Hello, World!')
})

const libp2pConfig = getLibp2pConfig()
traceFunction(libp2pConfig) // Initialize tracing with libp2p config

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
