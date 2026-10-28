CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

select * from usuarios; 

CREATE TABLE ingresos (
    id_ingreso SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    monto NUMERIC(12,2) NOT NULL
        CHECK (monto > 0),
    frecuencia VARCHAR(20) NOT NULL
        CHECK (frecuencia IN (
            'Diario', 'Semanal', 'Quincenal',
            'Mensual', 'Anual'
        )),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);

CREATE TABLE gastos (
    id_gasto SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150),
    monto NUMERIC(12,2) NOT NULL
        CHECK (monto > 0),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('Fijo', 'Variable')),
    frecuencia VARCHAR(20) NOT NULL
        CHECK (frecuencia IN (
            'Diario', 'Semanal', 'Quincenal',
            'Mensual', 'Anual'
        )),
    fecha_registro TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);


CREATE TABLE metas_financieras (
    id_meta SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    nombre_meta VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    monto_objetivo NUMERIC(12,2) NOT NULL
        CHECK (monto_objetivo > 0),
    monto_ahorrado NUMERIC(12,2) NOT NULL
        DEFAULT 0 CHECK (monto_ahorrado >= 0),
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    fecha_objetivo DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'En progreso'
        CHECK (estado IN (
            'En progreso', 'Completada', 'Cancelada'
        )),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);


CREATE TABLE perfiles_riesgo (
    id_perfil SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL UNIQUE,
    puntuacion INTEGER NOT NULL
        CHECK (puntuacion BETWEEN 0 AND 100),
    tipo_perfil VARCHAR(20) NOT NULL
        CHECK (tipo_perfil IN (
            'Conservador', 'Moderado', 'Agresivo'
        )),
    horizonte_inversion VARCHAR(20) NOT NULL
        CHECK (horizonte_inversion IN (
            'Corto', 'Mediano', 'Largo'
        )),
    fecha_evaluacion TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);


CREATE TABLE presupuestos (
    id_presupuesto SERIAL PRIMARY KEY,

    id_usuario INTEGER NOT NULL
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    categoria VARCHAR(50) NOT NULL,

    monto_limite NUMERIC(12,2) NOT NULL
        CHECK (monto_limite > 0),

    mes INTEGER NOT NULL
        CHECK (mes BETWEEN 1 AND 12),

    anio INTEGER NOT NULL
        CHECK (anio BETWEEN 2000 AND 2100),

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT presupuesto_unico
        UNIQUE (id_usuario, categoria, mes, anio)
);


CREATE TABLE deudas (
    id_deuda SERIAL PRIMARY KEY,

    id_usuario INTEGER NOT NULL
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    nombre_deuda VARCHAR(100) NOT NULL,

    descripcion TEXT,

    monto_original NUMERIC(12,2) NOT NULL
        CHECK (monto_original > 0),

    saldo_pendiente NUMERIC(12,2) NOT NULL
        CHECK (saldo_pendiente >= 0),

    tasa_interes NUMERIC(5,2) NOT NULL DEFAULT 0
        CHECK (tasa_interes BETWEEN 0 AND 100),

    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,

    fecha_vencimiento DATE,

    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
        CHECK (estado IN ('Pendiente', 'Pagada')),

    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT saldo_valido
        CHECK (saldo_pendiente <= monto_original),

    CONSTRAINT fechas_validas
        CHECK (
            fecha_vencimiento IS NULL
            OR fecha_vencimiento >= fecha_inicio
        )
);

