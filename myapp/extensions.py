# myapp/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt     import Bcrypt
from flask_login      import LoginManager
from flask_migrate    import Migrate
from flask_mail       import Mail
from flask_limiter    import Limiter
from flask_limiter.util import get_remote_address

db            = SQLAlchemy()
bcrypt        = Bcrypt()
login_manager = LoginManager()
migrate       = Migrate()
mail          = Mail()

# Rate‐limiter: tracks by IP, sends standard X-RateLimit headers
limiter = Limiter(
    key_func=get_remote_address,
    headers_enabled=True
)
