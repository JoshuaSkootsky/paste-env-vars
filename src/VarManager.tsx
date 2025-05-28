import React, { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'

// EnvironmentVariable is a single row in the table
type EnvironmentVariable = {
  id: string
  key: string
  value: string
}

const INITIAL_ROW_COUNT = 20
const KEY_REGEX = /^[A-Za-z0-9_]+$/

// createEmptyVariable is a helper function to create an empty row
const createEmptyVariable = (): EnvironmentVariable => ({
  id: uuidv4(),
  key: '',
  value: '',
})

// VarManager is the main component that manages the environment variables
export const VarManager = () => {
  // rawText is the raw paste of text
  const [rawText, setRawText] = useState<string>('')

  // variables are the environment variables
  const [variables, setVariables] = useState<EnvironmentVariable[]>(() =>
    Array.from({ length: INITIAL_ROW_COUNT }, createEmptyVariable)
  )

  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  // rowErrors are key validation errors
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  // handleTextChange sets the raw text on paste or change
  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(event.target.value)
  }



  // parseAndPopulate parses the raw text for env vars
  const parseAndPopulate = () => {
    setError(null)
    setStatus(null)
    const lines = rawText.split('\n')
    const parsedItems: { key: string; value: string; line: number }[] = []
    const parseWarningMessages: string[] = []
    const keyCounts: Record<string, number> = {}

    lines.forEach((line, index) => {
      const lineNum = index + 1
      const trimmedLine = line.trim()
      if (trimmedLine === '' || trimmedLine.startsWith('#')) return // Skip empty lines and comments

      // Attempt to find the first '=' to split key and value
      const eqIndex = trimmedLine.indexOf('=')

      if (eqIndex === -1) {
        // No '=' found, add a warning
        parseWarningMessages.push(
          `Warning: Line ${lineNum} does not contain '='. Input: "${trimmedLine}". Skipping.`
        )
        return
      }

      const key = trimmedLine.substring(0, eqIndex).trim()
      const value = trimmedLine.substring(eqIndex + 1).trim() // Value can be empty

      if (key) {
        parsedItems.push({ key, value, line: lineNum })
      } else {
        // Key is empty even if '=' was present
        parseWarningMessages.push(
          `Warning: Empty key on line ${
            index + 1
          }. Input: "${trimmedLine}". Skipping.`
        )
      }
    })

    // Detect duplicates
    Object.entries(keyCounts).forEach(([k, occ]) => {
      if (occ > 1 && Array.isArray(keyCounts[k])) {
        parseWarningMessages.push(
          `Duplicate key "${k}" on lines ${keyCounts[k].join(', ')}`
        )
      }
    })

    // Set error state if there were warnings
    if (parseWarningMessages.length > 0) {
      setError(parseWarningMessages.join('\n'))
    } else {
      setError(null) // Clear errors if parsing was clean
      setStatus('Parsed successfully!')
    }

    // Build newVars, overwriting earlier duplicates by picking last
    const deduped = parsedItems.reduce<Record<string, string>>(
      (acc, { key, value }) => ({ ...acc, [key]: value }),
      {}
    )
    const entries = Object.entries(deduped)
    const rowCount = Math.max(INITIAL_ROW_COUNT, entries.length)
    const newVars: EnvironmentVariable[] = []

    for (let i = 0; i < rowCount; i++) {
      if (i < entries.length) {
        const [k, v] = entries[i]
        newVars.push({ id: uuidv4(), key: k, value: v })
      } else {
        newVars.push(createEmptyVariable())
      }
    }

    setVariables(newVars)
  }

  const handleVariableChange = (
    id: string,
    field: 'key' | 'value',
    v: string
  ) => {
    setVariables((pv) =>
      pv.map((row) => (row.id === id ? { ...row, [field]: v } : row))
    )
    if (field === 'key') {
      if (!v.trim()) {
        setRowErrors((e) => ({ ...e, [id]: 'Key is required.' }))
      } else if (!KEY_REGEX.test(v)) {
        setRowErrors((e) => ({
          ...e,
          [id]: 'Only letters, digits, and underscore allowed.',
        }))
      } else {
        setRowErrors((e) => ({
          ...e,
          [id]: `Error in ${id}`,
        }))
      }
    }
  }

  const addVariableRow = () =>
    setVariables((pv) => [...pv, createEmptyVariable()])

  const deleteVariableRow = (id: string) =>
    setVariables((pv) => pv.filter((r) => r.id !== id))

  const clearAll = () => {
    setVariables(Array.from({ length: INITIAL_ROW_COUNT }, createEmptyVariable))
    setRowErrors({})
    setError(null)
    setRawText('')
    setStatus(null)
  }
  const clearText = () => setRawText('')

  const getOutputText = () =>
    variables
      .filter((r) => r.key.trim() && !rowErrors[r.id])
      .map((r) => `${r.key}=${r.value}`)
      .join('\n')

  const copyToClipboard = () => {
    const out = getOutputText()
    if (!out) return alert('Nothing valid to copy.')
    navigator.clipboard
      .writeText(out)
      .then(() => alert('Copied!'))
      .catch(() => alert('Copy failed.'))
  }

  // AUTO_CLEAR_STATUS_INTERVAL is how long in ms to wait before clearing status
  const AUTO_CLEAR_STATUS_INTERVAL = 10000
  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), AUTO_CLEAR_STATUS_INTERVAL)
      return () => clearTimeout(t)
    }
  }, [status])

    useEffect(() => {

  if (rawText !== '') {
    parseAndPopulate()
  }
}, [rawText, parseAndPopulate])

  return (
    <div className="w-full p-4 md:p-6 bg-gray-800 shadow-xl rounded-lg">
      <h2 className="text-2xl font-semibold text-white mb-4">
        Environment Variable Editor
      </h2>
      <p className="text-sm text-gray-300 mb-2">
        Paste <code>KEY=VALUE</code> lines or edit below.
      </p>

      <textarea
        rows={6}
        className="w-full mb-3 p-2.5 text-sm"
        value={rawText}
        onChange={handleTextChange}
        placeholder={'KEY1=VALUE1\nKEY2=VALUE2'}
        aria-label="Bulk paste ENV vars"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        
        <button
          onClick={copyToClipboard}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
        >
          Copy to Clipboard as KEY=VALUE
        </button>
        <button
          onClick={addVariableRow}
          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
        >
          + Row
        </button>
        <button
          onClick={clearText}
          className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded"
        >
          Clear Text
        </button>
        <button
          onClick={clearAll}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
        >
          Clear All
        </button>
      </div>

      {error && (
        <pre className="bg-yellow-900 text-yellow-200 p-2 rounded mb-3 text-xs">
          {error}
        </pre>
      )}
      {status && (
        <div className="bg-green-800 text-green-200 p-2 rounded mb-3 text-sm">
          {status}
        </div>
      )}

      <h3 className="text-xl font-medium text-white mb-2">
        Variables ({variables.length})
      </h3>
      <div className="max-h-[50vh] overflow-y-auto border p-2 rounded bg-gray-850">
        {variables.map((row, i) => (
          <div
            key={row.id}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2"
          >
            <span className="text-gray-400 w-6 select-none">{i + 1}.</span>
            <div className="flex-1">
              <input
                type="text"
                aria-label={`Key for row ${i + 1}`}
                placeholder="KEY"
                value={row.key}
                onChange={(e) =>
                  handleVariableChange(row.id, 'key', e.target.value)
                }
                className={`w-full text-sm p-1 rounded border ${
                  rowErrors[row.id]
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-600'
                }`}
              />
              {rowErrors[row.id] && (
                <div className="text-red-400 text-xs">{rowErrors[row.id]}</div>
              )}
            </div>
            <span className="hidden sm:inline text-gray-500">=</span>
            <input
              type="text"
              aria-label={`Value for row ${i + 1}`}
              placeholder="VALUE"
              value={row.value}
              onChange={(e) =>
                handleVariableChange(row.id, 'value', e.target.value)
              }
              className="flex-2 text-sm p-1 rounded border border-gray-600"
            />
            <button
              onClick={() => deleteVariableRow(row.id)}
              aria-label={`Delete row ${i + 1}`}
              className="text-red-400 hover:text-red-600 px-2"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
