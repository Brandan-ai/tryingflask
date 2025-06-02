# routes.py

from flask import render_template, redirect, url_for, flash, request, jsonify, Blueprint
from flask_login import login_user, logout_user, login_required, current_user
from .forms import RegistrationForm, LoginForm
from .extensions import db, login_manager
from .models import User, Attempt

# • Define stats blueprint
stats_bp = Blueprint('stats', __name__)

def init_routes(app):
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Suppress Flask-Login's default flashes
    login_manager.login_view = 'login'
    login_manager.login_message = None
    login_manager.needs_refresh_message = None

    @app.route('/register', methods=['GET', 'POST'])
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

    @app.route('/login', methods=['GET', 'POST'])
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

    @app.route('/settings')
    @login_required
    def settings():
        return render_template('settings.html')

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
        return jsonify(success=True)

# • Stats routes attached to stats_bp
@stats_bp.route('/stats',endpoint='stats')
@login_required
def stats_page():
    return render_template('stats.html')

@stats_bp.route('/stats_data', methods=['GET'])
@login_required
def stats_data():
    level = request.args.get('level', type=int)
    metric = request.args.get('metric', type=str)
    attempts = (
        Attempt.query
        .filter_by(user_id=current_user.id, level=level)
        .order_by(Attempt.timestamp)
        .all()
    )
    timestamps = []
    values = []
    for a in attempts:
        timestamps.append(a.timestamp.strftime('%Y-%m-%d %H:%M:%S'))
        if metric == 'accuracy':
            values.append(round((a.correct_count / a.total_questions) * 100, 2))
        else:
            values.append(round(a.time_taken, 2))
    return jsonify({'timestamps': timestamps, 'values': values})

# • Expose init_routes and stats_bp
__all__ = ['init_routes', 'stats_bp']
