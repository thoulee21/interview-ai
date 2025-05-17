import multiprocessing

# 绑定地址和端口
bind = '0.0.0.0:5000'

# 工作进程数
workers = multiprocessing.cpu_count() * 2 + 1

# 每个工作进程的线程数
threads = 4

# 请求超时时间
keepalive = 2
graceful_timeout = 120

# 访问日志和错误日志路径
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'

# 日志级别
loglevel = 'info'

# 是否启用守护进程模式
daemon = False
