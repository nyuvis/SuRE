FROM python:3

COPY . /app
WORKDIR /app

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
EXPOSE 6060

CMD ["python", "server/server.py"]