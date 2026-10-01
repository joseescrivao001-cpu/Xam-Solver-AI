
const fs = require('fs');
let code = fs.readFileSync('src/app/api/chat/route.ts', 'utf8');

code = code.replace(/resolu\uFFFD\uFFFDo/g, 'resolução');
code = code.replace(/acad\uFFFDmicos/g, 'acadêmicos');
code = code.replace(/n\uFFFDcleo/g, 'núcleo');
code = code.replace(/intelig\uFFFDncia/g, 'inteligência');
code = code.replace(/avan\uFFFDada/g, 'avançada');
code = code.replace(/miss\uFFFDo \uFFFD/g, 'missão é');
code = code.replace(/at\uFFFDmicos/g, 'atômicos');
code = code.replace(/OBRIGAT\uFFFD.RIO/g, 'OBRIGATÓRIO');
code = code.replace(/INVIOL\uFFFD.\?VEL/g, 'INVIOLÁVEL');
code = code.replace(/VOC\uFFFD/g, 'VOCÊ');
code = code.replace(/PORTUGU\uFFFDS/g, 'PORTUGUÊS');
code = code.replace(/\uFFFD a/g, 'é a');
code = code.replace(/\uFFFDnica/g, 'única');
code = code.replace(/l\uFFFDngua/g, 'língua');
code = code.replace(/ingl\uFFFDs/g, 'inglês');
code = code.replace(/franc\uFFFDs/g, 'francês');
code = code.replace(/circunst\uFFFDncia/g, 'circunstância');
code = code.replace(/ser\uFFFD/g, 'será');
code = code.replace(/inclu\uFFFDda/g, 'incluída');
code = code.replace(/Voc\uFFFD/g, 'Você');
code = code.replace(/analis\uFFFD-la/g, 'analisá-la');
code = code.replace(/vis\uFFFDveis/g, 'visíveis');
code = code.replace(/quest\uFFFDo/g, 'questão');
code = code.replace(/t\uFFFDcnico/g, 'técnico');
code = code.replace(/n\uFFFDo/g, 'não');
code = code.replace(/process\uFFFDvel/g, 'processável');
code = code.replace(/pe\uFFFDa/g, 'peça');
code = code.replace(/usu\uFFFDrio/g, 'usuário');
code = code.replace(/cria\uFFFD\uFFFDo/g, 'criação');
code = code.replace(/Jos\uFFFD/g, 'José');
code = code.replace(/Escriv\uFFFDo/g, 'Escrivão');
code = code.replace(/vision\uFFFDrio/g, 'visionário');
code = code.replace(/Inform\uFFFDtica/g, 'Informática');
code = code.replace(/T\uFFFDcnico/g, 'Técnico');
code = code.replace(/M\uFFFDdio/g, 'Médio');
code = code.replace(/al\uFFFDm/g, 'além');
code = code.replace(/vis\uFFFDo/g, 'visão');
code = code.replace(/Vis\uFFFDo/g, 'Visão');
code = code.replace(/B\uFFFDsico/g, 'Básico');
code = code.replace(/Avan\uFFFDo/g, 'Avançado');
code = code.replace(/SAUDA\uFFFD ES/g, 'SAUDAÇÕES');
code = code.replace(/sauda\uFFFD\uFFFDo/g, 'saudação');
code = code.replace(/ol\uFFFD/g, 'olá');
code = code.replace(/N\uFFFD\uFFFDO/g, 'NÃO');
code = code.replace(/Matem\uFFFDtica/g, 'Matemática');
code = code.replace(/F\uFFFDsica/g, 'Física');
code = code.replace(/Qu\uFFFDmica/g, 'Química');
code = code.replace(/d\uFFFDvida/g, 'dúvida');

code = code.replace(/Y-.\?/g, '🖼️');
code = code.replace(/YO\?/g, '🌍');

fs.writeFileSync('src/app/api/chat/route.ts', code);

