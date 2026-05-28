/* global React, Icon, Badge */
// Configuración screen

const {
  useState: useStateC
} = React;
const ConfiguracionScreen = ({
  onToast
}) => {
  const [lang, setLang] = useStateC('es');
  const [stripeStatus] = useStateC('Conectado');
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-text"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "page-greeting"
  }, "Configuraci\xF3n"), /*#__PURE__*/React.createElement("p", {
    className: "page-sub"
  }, "Gestiona los ajustes principales de tu iglesia")), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => onToast({
      title: 'Cambios guardados',
      sub: 'Tus ajustes se actualizaron correctamente.'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), " Guardar cambios"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card col-span-8"
  }, /*#__PURE__*/React.createElement(SettingHeader, {
    icon: "sparkle",
    title: "Datos de la iglesia",
    desc: "Informaci\xF3n oficial usada en recibos, reportes y comunicaci\xF3n con el IRS."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "field",
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("label", null, "Nombre legal"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "Iglesia Casa de Restauraci\xF3n Inc."
  }), /*#__PURE__*/React.createElement("span", {
    className: "hint"
  }, "Usado en recibos fiscales y documentos oficiales")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Nombre p\xFAblico"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "Casa de Restauraci\xF3n"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "EIN ", /*#__PURE__*/React.createElement("span", {
    className: "hint"
  }, "(IRS)")), /*#__PURE__*/React.createElement("input", {
    defaultValue: "86-2143598",
    className: "mono"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field",
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("label", null, "Direcci\xF3n"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "2310 SW 27th Ave, Miami FL 33145"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Tel\xE9fono"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "(305) 555-0100"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Email"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "admin@casaderestauracion.org"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Pastor principal"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "Miguel \xC1ngel Rodr\xEDguez"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Tesorero"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "Ana Patricia Soto"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-4",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement(SettingHeader, {
    icon: "globe",
    title: "Idioma",
    desc: "Idioma del panel y de las comunicaciones con donantes.",
    compact: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setLang('es'),
    style: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      border: lang === 'es' ? '2px solid var(--navy)' : '1px solid var(--border)',
      background: lang === 'es' ? '#F4ECE2' : 'var(--card)',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      marginBottom: 4
    }
  }, "\uD83C\uDDEA\uD83C\uDDF8"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13
    }
  }, "Espa\xF1ol"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Predeterminado")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLang('en'),
    style: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      border: lang === 'en' ? '2px solid var(--navy)' : '1px solid var(--border)',
      background: lang === 'en' ? '#F4ECE2' : 'var(--card)',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      marginBottom: 4
    }
  }, "\uD83C\uDDFA\uD83C\uDDF8"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13
    }
  }, "English"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Biling\xFCe"))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      background: 'linear-gradient(135deg, #1F2B38, #2B3A4A)',
      color: '#fff',
      borderColor: 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: 'rgba(184, 154, 122, 0.2)',
      color: '#B89A7A',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 16
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      fontWeight: 700
    }
  }, "Suscripci\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, "Plan Ministerio"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(CfgRow, {
    dark: true,
    label: "Estado",
    value: /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      dot: true
    }, "Activa")
  }), /*#__PURE__*/React.createElement(CfgRow, {
    dark: true,
    label: "Pr\xF3ximo cobro",
    value: "15 jun 2026"
  }), /*#__PURE__*/React.createElement(CfgRow, {
    dark: true,
    label: "M\xE9todo de pago",
    value: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFeatureSettings: '"tnum"'
      }
    }, "\u2022\u2022\u2022\u2022 4892")
  }), /*#__PURE__*/React.createElement(CfgRow, {
    dark: true,
    label: "Importe",
    value: "$49 /mes"
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      width: '100%',
      justifyContent: 'center',
      marginTop: 14,
      background: 'var(--coffee)',
      color: '#fff'
    }
  }, "Ver facturaci\xF3n ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrowRight",
    size: 12
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-7"
  }, /*#__PURE__*/React.createElement(SettingHeader, {
    icon: "users",
    title: "Usuarios y permisos",
    desc: "Define qui\xE9n accede al sistema y con qu\xE9 nivel de permisos.",
    action: /*#__PURE__*/React.createElement("button", {
      className: "btn btn-sm btn-primary"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), " Invitar usuario")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 0 8px'
    }
  }, [{
    name: 'Miguel Ángel Rodríguez',
    email: 'miguel@casaderestauracion.org',
    role: 'Pastor / Admin',
    tone: 'coffee',
    initials: 'MR',
    last: 'Activo ahora'
  }, {
    name: 'Ana Patricia Soto',
    email: 'ana@casaderestauracion.org',
    role: 'Tesorero',
    tone: 'navy',
    initials: 'AS',
    last: 'Hace 1 hora'
  }, {
    name: 'Carla Domínguez',
    email: 'carla@casaderestauracion.org',
    role: 'Secretaria',
    tone: 'navy',
    initials: 'CD',
    last: 'Ayer'
  }, {
    name: 'Pedro Castillo',
    email: 'pedro@casaderestauracion.org',
    role: 'Líder de ministerio',
    tone: 'navy',
    initials: 'PC',
    last: 'Hace 3 días'
  }].map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 24px',
      borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: `avatar ${u.tone === 'coffee' ? 'coffee' : 'navy'}`
  }, u.initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, u.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, u.email)), /*#__PURE__*/React.createElement(RoleBadge, {
    role: u.role
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)',
      width: 100,
      textAlign: 'right'
    }
  }, u.last), /*#__PURE__*/React.createElement("div", {
    className: "row-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    title: "Cambiar rol"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "edit",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    title: "Desactivar"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-5"
  }, /*#__PURE__*/React.createElement(SettingHeader, {
    icon: "creditCard",
    title: "Stripe / M\xE9todos de pago",
    desc: "Conexi\xF3n con tu procesador de pagos.",
    compact: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 24px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--success-bg)',
      border: '1px solid #D4E8DC',
      borderRadius: 12,
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: '#fff',
      display: 'grid',
      placeItems: 'center',
      color: '#635BFF',
      fontWeight: 800,
      fontSize: 14
    }
  }, "S"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13
    }
  }, "Cuenta Stripe conectada"), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, stripeStatus)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "acct_1NkLpQ... \xB7 \xDAltima sync: hace 4 min")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, "Gestionar")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: 10
    }
  }, "M\xE9todos activos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, [{
    method: 'Tarjeta de crédito/débito',
    icon: 'creditCard',
    on: true,
    fee: '2.9% + $0.30'
  }, {
    method: 'ACH · Transferencia bancaria',
    icon: 'wallet',
    on: true,
    fee: '0.8% (máx $5)'
  }, {
    method: 'Apple Pay / Google Pay',
    icon: 'smartphone',
    on: true,
    fee: 'Incluido'
  }].map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      border: '1px solid var(--border-soft)',
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon,
    size: 16
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, m.method), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted)'
    }
  }, "Comisi\xF3n \xB7 ", m.fee)), /*#__PURE__*/React.createElement("div", {
    className: `toggle ${m.on ? 'on' : ''}`
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "card col-span-12"
  }, /*#__PURE__*/React.createElement(SettingHeader, {
    icon: "receipt",
    title: "Recibos de contribuci\xF3n",
    desc: "Personaliza los recibos enviados a tus donantes. Cumplen con los requisitos del IRS para deducciones."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 24px 24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Logo en recibos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 12,
      background: 'var(--coffee)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontWeight: 700
    }
  }, "CR"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 12
  }), " Cambiar logo"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Representante autorizado"), /*#__PURE__*/React.createElement("input", {
    defaultValue: "Miguel \xC1ngel Rodr\xEDguez \xB7 Pastor Principal"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Mensaje por defecto"), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: "Gracias por tu generosidad y compromiso con el Reino. Tu aporte se invierte fielmente en la obra del Se\xF1or."
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Aviso fiscal ", /*#__PURE__*/React.createElement("span", {
    className: "hint"
  }, "(requerido por el IRS)")), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: "No se entregaron bienes ni servicios a cambio de esta contribuci\xF3n, excepto beneficios religiosos intangibles."
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Incluir firma manuscrita"), /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, "Aparece al final del recibo en formato escaneado.")), /*#__PURE__*/React.createElement("div", {
    className: "toggle on"
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: 10
    }
  }, "Vista previa del recibo"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 10,
      background: 'var(--coffee)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontWeight: 700,
      fontSize: 14
    }
  }, "CR"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "Iglesia Casa de Restauraci\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--muted)'
    }
  }, "EIN 86-2143598 \xB7 501(c)(3)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--muted)'
    }
  }, "Recibo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700
    },
    className: "mono"
  }, "#2024-126"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 11,
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--muted)'
    }
  }, "Donante"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Mar\xEDa Gonz\xE1lez P\xE9rez"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--muted)'
    }
  }, "Aporte"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "$250.00 \xB7 Fondo General \xB7 23 mayo 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 10,
      background: 'var(--bg)',
      borderRadius: 8,
      fontSize: 10,
      color: 'var(--muted)',
      lineHeight: 1.5
    }
  }, "\"Gracias por tu generosidad y compromiso con el Reino. Tu aporte se invierte fielmente en la obra del Se\xF1or.\""), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 10,
      background: '#FBF8F4',
      borderRadius: 8,
      fontSize: 9,
      color: '#856630',
      lineHeight: 1.5,
      fontStyle: 'italic'
    }
  }, "No se entregaron bienes ni servicios a cambio de esta contribuci\xF3n, excepto beneficios religiosos intangibles."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 12,
      borderTop: '1px solid var(--border-soft)',
      fontSize: 10,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontStyle: 'italic',
      fontFamily: 'cursive',
      fontSize: 14,
      color: 'var(--text)',
      marginBottom: 2
    }
  }, "Miguel A. Rodr\xEDguez"), "Pastor Principal \xB7 Representante autorizado")))))));
};
const SettingHeader = ({
  icon,
  title,
  desc,
  action,
  compact
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    padding: compact ? '20px 24px 12px' : '20px 24px',
    borderBottom: compact ? 'none' : '1px solid var(--border-soft)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'var(--coffee-bg)',
    color: 'var(--coffee)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 16
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("h3", {
  style: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700
  }
}, title), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2
  }
}, desc)), action);
const CfgRow = ({
  label,
  value,
  dark
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--border-soft)'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: dark ? 'rgba(255,255,255,0.6)' : 'var(--muted)'
  }
}, label), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 600,
    color: dark ? '#fff' : 'var(--text)'
  }
}, value));
const RoleBadge = ({
  role
}) => {
  const map = {
    'Pastor / Admin': 'coffee',
    'Tesorero': 'navy',
    'Secretaria': 'info',
    'Líder de ministerio': 'muted'
  };
  return /*#__PURE__*/React.createElement(Badge, {
    tone: map[role] || 'muted'
  }, role);
};
window.ConfiguracionScreen = ConfiguracionScreen;