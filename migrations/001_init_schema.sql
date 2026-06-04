-- 启用PostGIS扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 岩性字典表
CREATE TABLE IF NOT EXISTS lithology_dict (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    pattern VARCHAR(100),
    color VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 钻孔表
CREATE TABLE IF NOT EXISTS boreholes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    elevation NUMERIC(10, 2),
    total_depth NUMERIC(10, 2),
    drilling_date DATE,
    project_id UUID REFERENCES projects(id),
    driller VARCHAR(200),
    recorder VARCHAR(200),
    geologist VARCHAR(200),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建空间索引
CREATE INDEX IF NOT EXISTS boreholes_location_idx ON boreholes USING GIST(location);

-- 地层分层表
CREATE TABLE IF NOT EXISTS stratum_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borehole_id UUID REFERENCES boreholes(id) ON DELETE CASCADE,
    layer_index INTEGER NOT NULL,
    depth_from NUMERIC(10, 2) NOT NULL,
    depth_to NUMERIC(10, 2) NOT NULL,
    thickness NUMERIC(10, 2) NOT NULL,
    lithology_code VARCHAR(50) REFERENCES lithology_dict(code),
    lithology_desc TEXT,
    color VARCHAR(100),
    structure VARCHAR(200),
    weathering VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(borehole_id, layer_index)
);

-- 剖面线表
CREATE TABLE IF NOT EXISTS section_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    line GEOGRAPHY(LineString, 4326) NOT NULL,
    borehole_ids JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建空间索引
CREATE INDEX IF NOT EXISTS section_lines_line_idx ON section_lines USING GIST(line);

-- 断层表
CREATE TABLE IF NOT EXISTS faults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    fault_type VARCHAR(50) NOT NULL CHECK (fault_type IN ('normal', 'reverse', 'strike-slip')),
    start_point GEOGRAPHY(Point, 4326) NOT NULL,
    end_point GEOGRAPHY(Point, 4326) NOT NULL,
    fault_line GEOGRAPHY(LineString, 4326) NOT NULL,
    dip_angle NUMERIC(5, 2) DEFAULT 60,
    throw_amount NUMERIC(10, 2) DEFAULT 0,
    heave_amount NUMERIC(10, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS faults_fault_line_idx ON faults USING GIST(fault_line);

-- 初始化岩性字典数据
INSERT INTO lithology_dict (code, name, category, pattern, color, description) VALUES
    ('Q', '填土', '第四系', 'dots', '#D2B48C', '人工堆积的填土'),
    ('Qml', '素填土', '第四系', 'dots', '#DEB887', '由碎石、砂土、粉土等组成的填土'),
    ('Qpd', '耕植土', '第四系', 'crosshatch', '#8B4513', '含植物根茎的耕植土'),
    ('Qal', '粉质黏土', '第四系', 'diagonal', '#CD853F', '冲洪积粉质黏土'),
    ('Qpl', '粉土', '第四系', 'vertical', '#D2691E', '坡洪积粉土'),
    ('Qs', '砂土', '第四系', 'horizontal', '#F4A460', '冲洪积砂土'),
    ('Qc', '碎石土', '第四系', 'crosshatch', '#A0522D', '坡洪积碎石土'),
    ('K', '泥岩', '白垩系', 'horizontal', '#696969', '白垩系泥岩'),
    ('Ks', '砂岩', '白垩系', 'brick', '#A0522D', '白垩系砂岩'),
    ('Kc', '砾岩', '白垩系', 'dots', '#8B4513', '白垩系砾岩'),
    ('J', '页岩', '侏罗系', 'wavy', '#2F4F4F', '侏罗系页岩'),
    ('Js', '石灰岩', '侏罗系', 'dots', '#F5F5DC', '侏罗系石灰岩'),
    ('Jm', '煤层', '侏罗系', 'solid', '#2C2C2C', '侏罗系煤层'),
    ('T', '花岗岩', '三叠系', 'random', '#808080', '三叠系花岗岩'),
    ('Tg', '片麻岩', '三叠系', 'diagonal', '#556B2F', '三叠系片麻岩'),
    ('Tm', '大理岩', '三叠系', 'vertical', '#FFFAF0', '三叠系大理岩'),
    ('W', '地下水', '水文', 'solid', '#0EA5E9', '地下水水位')
ON CONFLICT (code) DO NOTHING;

-- 初始化示例项目数据
INSERT INTO projects (id, name, description, start_date, status) VALUES
    ('proj-001', '某新城地质勘察项目', '某市新城区详细地质勘察工程，共布置钻孔50个', '2024-03-01', 'active'),
    ('proj-002', '高速公路地质勘察', '某高速公路沿线地质勘察项目', '2024-01-15', 'active')
ON CONFLICT (id) DO NOTHING;
