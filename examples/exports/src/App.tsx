// eslint-disable-next-line no-use-before-define
import React, { useState2, useEffect, ReactDom } from './exports'
import 'antd/dist/antd.less'
import { Button } from 'antd'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function App() {
  const [count, setCount] = useState2(1)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('ReactDom', ReactDom)
  })

  return (
    <Button className="App" onClick={() => setCount(value => value + 1)}>
      test externals ({count})
    </Button>
  )
}

export default App
