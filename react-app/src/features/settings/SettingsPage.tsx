import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/auth-context';
import type { Errors } from '../../core/models/errors';
import { ListErrors } from '../../shared/components/ListErrors';

export default function SettingsPage() {
  const { currentUser, update, logout } = useAuth();
  const navigate = useNavigate();

  const [image, setImage] = useState(currentUser?.image ?? '');
  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<Errors | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await update({ image, username, bio, email, password });
      void navigate(`/profile/${user.username}`);
    } catch (err) {
      setErrors(err as Errors);
      setIsSubmitting(false);
    }
  };

  const onLogout = () => {
    logout();
    void navigate('/');
  };

  return (
    <app-settings-page>
      <div className="settings-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-6 offset-md-3 col-xs-12">
              <h1 className="text-xs-center">Your Settings</h1>

              <ListErrors errors={errors} />

              <form onSubmit={event => void submitForm(event)}>
                <fieldset disabled={isSubmitting}>
                  <fieldset className="form-group">
                    <input
                      className="form-control"
                      type="text"
                      placeholder="URL of profile picture"
                      value={image}
                      onChange={event => setImage(event.target.value)}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={event => setUsername(event.target.value)}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <textarea
                      className="form-control form-control-lg"
                      rows={8}
                      placeholder="Short bio about you"
                      value={bio}
                      onChange={event => setBio(event.target.value)}
                    ></textarea>
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="password"
                      placeholder="New Password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                    />
                  </fieldset>

                  <button className="btn btn-lg btn-primary pull-xs-right" type="submit">
                    Update Settings
                  </button>
                </fieldset>
              </form>

              {/* Line break for logout button */}
              <hr />

              <button className="btn btn-outline-danger" onClick={onLogout}>
                Or click here to logout.
              </button>
            </div>
          </div>
        </div>
      </div>
    </app-settings-page>
  );
}
