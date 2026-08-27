FROM mariadb:11.4.5@sha256:49117dcc565cf51aa57ac5fca59ab31213402ff0eae6ffc13c46a37b938f7e4b

# The SDK's MySQL backup and restore invoke the pre-11 command names.
RUN ln -s /usr/bin/mariadb-admin /usr/local/bin/mysqladmin \
    && ln -s /usr/bin/mariadb-dump /usr/local/bin/mysqldump \
    && ln -s /usr/bin/mariadb /usr/local/bin/mysql \
    && ln -s /usr/bin/mariadb-install-db /usr/local/bin/mysql_install_db \
    && ln -s /usr/sbin/mariadbd /usr/local/bin/mysqld
