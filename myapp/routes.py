# myapp/routes.py

from flask import (
    render_template, redirect, url_for, flash,
    request, jsonify, Blueprint, current_app
)
from flask_login import (
    login_user, logout_user,
    login_required, current_user
)
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from .forms      import (
    RegistrationForm, LoginForm,
    PasswordResetRequestForm, ResetPasswordForm
)
from .extensions import db, login_manager, mail, limiter
from .models     import User, Attempt

stats_bp = Blueprint('stats', __name__)

def init_routes(app):
    # ─── User loader & login-manager config ─────────────────────────
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    login_manager.login_view           = 'login'
    login_manager.login_message        = None
    login_manager.needs_refresh_message= None

    # Serializer for reset tokens
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

    # ─── Register ────────────────────────────────────────────────────
    @app.route('/register', methods=['GET', 'POST'])
    @limiter.limit("10 per minute")
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('home'))
        form = RegistrationForm()
        if form.validate_on_submit():
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash('Account created!', 'success')
            return redirect(url_for('login'))
        if form.is_submitted() and form.errors:
            for field, errors in form.errors.items():
                label = getattr(form, field).label.text
                for err in errors:
                    flash(f"{label}: {err}", 'error')
        return render_template('register.html', form=form)

    # ─── Login ────────────────────────────────────────────────────────
    @app.route('/login', methods=['GET', 'POST'])
    @limiter.limit("5 per minute")
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('home'))
        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user and user.check_password(form.password.data):
                login_user(user)
                return redirect(url_for('home'))
            flash('Invalid credentials.', 'error')
        return render_template('login.html', form=form)

    # ─── Logout / Home / Game ────────────────────────────────────────
    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('login'))

    @app.route('/')
    @login_required
    def home():
        return render_template('home.html')

    @app.route('/game')
    @login_required
    def game():
        return render_template('game.html')

    # ─── Settings Page & Auto-Save Endpoint ─────────────────────────
    @app.route('/settings')
    @login_required
    def settings():
        return render_template(
            'settings.html',
            volume=current_user.volume,
            text_size=current_user.text_size
        )

    @app.route('/update_settings', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def update_settings():
        """
        Accepts JSON { volume, text_size } and persists it to current_user.
        Called by both Fetch (Save button) and sendBeacon (on unload).
        """
        data = request.get_json() or {}
        # Coerce to int, fallback to existing
        current_user.volume    = int(data.get('volume',    current_user.volume))
        current_user.text_size = int(data.get('text_size', current_user.text_size))
        db.session.commit()
        return jsonify(success=True)

    # ─── Submit Results ──────────────────────────────────────────────
    @app.route('/submit_results', methods=['POST'])
    @login_required
    def submit_results():
        data = request.get_json()
        attempt = Attempt(
            user_id=current_user.id,
            level=int(data['level']),
            topic=data['topic'],
            correct_count=int(data['correct_count']),
            total_questions=int(data['total_questions']),
            time_taken=float(data['time_taken'])
        )
        db.session.add(attempt)
        db.session.commit()

        best = (
            Attempt.query
            .filter_by(
                user_id=current_user.id,
                level=attempt.level,
                topic=attempt.topic
            )
            .order_by(Attempt.time_taken)
            .first()
        )
        best_time = round(best.time_taken, 2) if best else None
        return jsonify(success=True, best_time=best_time)

    # ─── Password Reset Request ──────────────────────────────────────
    @app.route('/reset_password_request', methods=['GET', 'POST'])
    @limiter.limit("3 per hour")
    def reset_request():
        if current_user.is_authenticated:
            return redirect(url_for('home'))
        form = PasswordResetRequestForm()
        if form.validate_on_submit():
            user = User.query.filter_by(email=form.email.data).first()
            flash('If that email is registered, you’ll receive a reset link.', 'info')
            if user:
                token = serializer.dumps(user.id, salt='password-reset-salt')
                reset_url = url_for('reset_token', token=token, _external=True)
                current_app.logger.debug('Reset URL: %s', reset_url)
                msg = Message('Password Reset Request', recipients=[user.email])
                msg.body = (
                    f'To reset your password, visit:\n\n{reset_url}\n\n'
                    'If you did not request this, simply ignore this email.'
                )
                mail.send(msg)
            return redirect(url_for('login'))
        return render_template('request_reset.html', form=form)

    # ─── Password Reset via Token ────────────────────────────────────
    @app.route('/reset_password/<token>', methods=['GET', 'POST'])
    @limiter.limit("5 per minute")
    def reset_token(token):
        current_app.logger.debug('Entered reset_token with token: %s', token)
        try:
            user_id = serializer.loads(token, salt='password-reset-salt', max_age=3600)
            current_app.logger.debug('Token valid, user_id: %s', user_id)
        except SignatureExpired as e:
            current_app.logger.warning('Token expired: %s', e)
            flash('That link has expired.', 'error')
            return render_template('request_reset.html', form=PasswordResetRequestForm())
        except (BadSignature, Exception) as e:
            current_app.logger.error('Invalid token: %s', e)
            flash('That link is invalid.', 'error')
            return render_template('request_reset.html', form=PasswordResetRequestForm())

        user = User.query.get(user_id)
        if not user:
            current_app.logger.error('No user found for ID: %s', user_id)
            flash('User not found.', 'error')
            return render_template('request_reset.html', form=PasswordResetRequestForm())

        form = ResetPasswordForm()
        if form.validate_on_submit():
            user.set_password(form.password.data)
            db.session.commit()
            flash('Your password has been reset. You can now log in.', 'success')
            return redirect(url_for('login'))

        return render_template('reset_password.html', form=form)

    # ─── Stats Blueprints ─────────────────────────────────────────────
    @stats_bp.route('/stats', endpoint='stats')
    @login_required
    def stats_page():
        return render_template('stats.html')

    @stats_bp.route('/stats_data', methods=['GET'])
    @login_required
    def stats_data():
        level   = request.args.get('level',   type=int)
        metric  = request.args.get('metric',  type=str)
        attempts= (
            Attempt.query
            .filter_by(user_id=current_user.id, level=level)
            .order_by(Attempt.timestamp)
            .all()
        )
        timestamps = []
        values     = []
        for a in attempts:
            timestamps.append(a.timestamp.strftime('%Y-%m-%d %H:%M:%S'))
            if metric == 'accuracy':
                values.append(round((a.correct_count / a.total_questions) * 100, 2))
            else:
                values.append(round(a.time_taken, 2))
        return jsonify({'timestamps': timestamps, 'values': values})

    # ─── Custom 429 Handler ───────────────────────────────────────────
    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return render_template('429.html'), 429
