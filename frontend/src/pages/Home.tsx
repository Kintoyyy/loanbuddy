interface HomeProps {
  onGoProfile: () => void;
  onLogout: () => void;
  onGoLanding: () => void;
}

function Home({ onGoProfile, onLogout, onGoLanding }: HomeProps) {
  return (
    <div className="page-container">
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h1>Home</h1>
            <p className="card-subtitle">You are logged in and ready to manage your account.</p>
          </div>
          <div className="button-row center-row">
            <button className="primary-button" onClick={onGoProfile}>
              Go to Profile
            </button>
            <button className="secondary-button" onClick={onGoLanding}>
              Landing
            </button>
            <button className="secondary-button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
