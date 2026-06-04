/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import routes from './routes/index.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/exports', express.static(path.join(process.cwd(), 'exports')))

/**
 * API Routes
 */
app.use('/api', routes)

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
