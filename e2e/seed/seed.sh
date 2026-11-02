#!/usr/bin/env bash
# Dữ liệu nền cần cho test (bảng danh mục đang trống ở DB local).
set -e
psql -h localhost -U postgres -d "${E2E_DB:-thermal_monitoring_v2}" <<'SQL'
insert into sensor_types(code,name,status) select 'TEST_STYPE','TEST_Loại cảm biến',1 where not exists (select 1 from sensor_types where code='TEST_STYPE');
SQL
