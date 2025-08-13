import './Menu.css'

function Menu({ setPage, currentPage }) {
    return (
        <div className="menu">
            <button 
                className={`btn btn-primary ${currentPage === 0 ? 'active' : ''}`} 
                onClick={() => setPage(0)}
            >
                Home
            </button>
            <button 
                className={`btn btn-secondary ${currentPage === 1 ? 'active' : ''}`} 
                onClick={() => setPage(1)}
            >
                Summary
            </button>
            <button 
                className={`btn btn-success ${currentPage === 2 ? 'active' : ''}`} 
                onClick={() => setPage(2)}
            >
                Devices
            </button>
            <button 
                className={`btn btn-danger ${currentPage === 3 ? 'active' : ''}`} 
                onClick={() => setPage(3)}
            >
                Profile
            </button>
        </div>
    )
}


export default Menu