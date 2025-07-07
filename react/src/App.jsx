import { useState } from 'react'
import './App.css'
import Title from './Title.jsx'
import Menu from './Menu.jsx'
import Content from './Content.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div id="header">
        <Title />
      </div>
      <div id="content">
        <Content />
      </div>
      <div id="menu">
        <Menu />
      </div>
    </>
  )
}

export default App
