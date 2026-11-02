#!/usr/bin/env bash
# Dọn dữ liệu test (tiền tố TEST_ / test_) khỏi DB local thermal_monitoring_v2. Chỉ xoá bản ghi do bộ E2E tạo.
set -e
DB="${E2E_DB:-thermal_monitoring_v2}"
psql -h localhost -U postgres -d "$DB" -v ON_ERROR_STOP=0 <<'SQL'
delete from notification_group_channels where notification_group_id in (select id from notification_groups where code like 'TEST\_%');
delete from notification_groups  where code like 'TEST\_%';
delete from notification_channels where code like 'TEST\_%';
delete from formulas   where code like 'TEST\_%';
delete from machines   where code like 'TEST\_%';
delete from sensors    where code like 'TEST\_%';
delete from cameras    where code like 'TEST\_%';
delete from machine_types where code like 'TEST\_%';
delete from camera_brands where code like 'TEST\_%';
delete from user_areas where user_id in (select id from users where username like 'test\_%');
delete from user_roles where user_id in (select id from users where username like 'test\_%');
delete from users     where username like 'test\_%';
delete from areas     where code like 'TEST\_%';
delete from provinces where code like 'TEST\_%';
delete from sensor_types where code like 'TEST\_%';
SQL
