import './Content.css'

function Content({ page }) {
    return (
        <>
            {page === 0 ? (
                <div className="content-frame">1</div>
            ) : page === 1 ? (
                <div className="content-frame">2</div>
            ) : page === 2 ? (
                <div className="content-frame">3</div>
            ) : (
                <div className="content-frame">4</div>
            )}
        </>
    )
}


export default Content