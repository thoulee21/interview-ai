"""
数据库工具模块
提供数据库连接和操作的工具函数
"""

import sqlite3
from flask import current_app, g


def get_db():
    """获取数据库连接"""
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """关闭数据库连接"""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    """初始化数据库"""
    conn = sqlite3.connect(current_app.config['DATABASE'])
    cursor = conn.cursor()

    # 创建面试会话表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interview_sessions (
        session_id TEXT PRIMARY KEY,
        position_type TEXT,
        difficulty TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status TEXT
    )
    ''')

    # 创建面试问题表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interview_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question TEXT,
        answer TEXT,
        evaluation TEXT,
        question_index INTEGER,
        created_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id)
    )
    ''')

    # 创建多模态分析结果表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS multimodal_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question_id INTEGER,
        video_analysis TEXT,
        audio_analysis TEXT,
        created_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id),
        FOREIGN KEY (question_id) REFERENCES interview_questions (id)
    )
    ''')

    # 创建最终评估表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS final_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        overall_score INTEGER,
        content_score INTEGER,
        delivery_score INTEGER,
        nonverbal_score INTEGER,
        strengths TEXT,
        improvements TEXT,
        recommendations TEXT,
        created_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id)
    )
    ''')

    # 创建用户表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE,
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        UNIQUE(username)
    )
    ''')

    # 创建用户-面试会话关联表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_sessions (
        user_id INTEGER,
        session_id TEXT,
        PRIMARY KEY (user_id, session_id),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id)
    )
    ''')

    # 创建职位类型表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS position_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 检查用户表是否为空，如果为空则添加默认管理员用户
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]

    if count == 0:
        # 添加默认管理员用户，密码为"admin123"的哈希值
        import hashlib
        default_password = hashlib.sha256("admin123".encode()).hexdigest()
        cursor.execute(
            "INSERT INTO users (username, password_hash, email, is_admin) VALUES (?, ?, ?, ?)",
            ("admin", default_password, "admin@example.com", 1)
        )

    # 检查职位类型表是否为空，如果为空则添加默认数据
    cursor.execute("SELECT COUNT(*) FROM position_types")
    count = cursor.fetchone()[0]

    if count == 0:
        # 默认职位类型数据
        default_position_types = [
            ("software_engineer", "软件工程师", "负责软件系统的设计、开发、测试和维护"),
            ("frontend_engineer", "前端开发工程师", "负责网站和应用程序的用户界面开发"),
            ("backend_engineer", "后端开发工程师", "负责服务器端逻辑和数据库交互的开发"),
            ("product_manager", "产品经理", "负责产品的规划、开发和市场推广"),
            ("ui_designer", "UI设计师", "负责用户界面的视觉设计"),
            ("ux_designer", "UX设计师", "负责用户体验设计和用户研究"),
            ("data_analyst", "数据分析师", "负责数据收集、处理和分析"),
            ("hr_specialist", "人力资源专员", "负责招聘、培训和员工关系管理"),
            ("marketing_specialist", "市场营销专员", "负责市场策略制定和执行"),
            ("operations_specialist", "运营专员", "负责日常运营和用户增长"),
            ("financial_analyst", "财务分析师", "负责财务数据分析和报告"),
            ("project_manager", "项目经理", "负责项目计划、执行和控制"),
            ("test_engineer", "测试工程师", "负责软件测试和质量保证"),
            ("devops_engineer", "DevOps工程师", "负责开发和运维的融合工作")
        ]

        cursor.executemany(
            "INSERT INTO position_types (value, label, description) VALUES (?, ?, ?)",
            default_position_types
        )

    conn.commit()
    conn.close()
