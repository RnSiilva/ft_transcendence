COMPOSE = docker compose

all: build up

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

status:
	docker ps

stop:
	$(COMPOSE) stop

down:
	$(COMPOSE) down

clean: down

fclean:
	$(COMPOSE) down -v
	docker system prune -af

re: fclean all

.PHONY: all build up status stop down clean fclean re