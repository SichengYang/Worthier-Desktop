import './Menu.css'

function Menu({ setPage }) {
    return (
        <div className="menu">
            <button className="btn btn-primary" onClick={() => setPage(0)}>Home</button>
            <button className="btn btn-secondary" onClick={() => setPage(1)}>Summary</button>
            <button className="btn btn-success" onClick={() => setPage(2)}>Devices</button>
            <button className="btn btn-danger" onClick={() => setPage(3)}>Profile</button>
        </div>
    )
}


export default Menu