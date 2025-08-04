import { useState } from 'react'
import './App.css'
import Title from './Title.jsx'
import Menu from './Menu.jsx'
import Content from './Content.jsx'
import { ThemeProvider } from './ThemeContext.jsx'

function App() {
  const [page, setPage] = useState(0);

  return (
    <ThemeProvider>
      <div id="header">
        <Title />
      </div>
      <div id="content">
        <Content page={page}/>
      </div>
      <div id="menu">
        <Menu setPage={setPage}/>
      </div>
    </ThemeProvider>
  )
}

export default App
