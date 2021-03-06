const { models } = require("./model");
const Sequelize = require("sequelize");
const { colorize, log, biglog, errorlog } = require("./out");

/**
* Muestra la ayuda.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.helpCmd = rl => {
  log("Commandos: ");
  log("h|help - Muestra esta ayuda.");
  log("list - Listar los quizzes existentes.");
  log("show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
  log("add - Añadir un nuevo quiz interactivamente.");
  log("delete <id> - Borrar el quiz indicado.");
  log("edit <id> - Editar el quiz indicado.");
  log("test <id> - Probar el quiz indicado.");
  log("p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  log("credits - Créditos.");
  log("q|quit - Salir del programa.");
  rl.prompt();
};

/**
* Lista todos los quizzes existentes en el modelo.
*
* @param rl Objeto readline usado para implementar el CLI
*/
exports.listCmd = rl => {
  models.quiz.findAll()
    .each(quiz => {
      log(`[${colorize(quiz.id, "magenta")}]: ${quiz.question}`);
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

/**
* Esta función devuleve una promsea que:
*   -Valida que se ha introducido un valor para el parametro.
*   -Convierte el parametro en un numero entero
* Si todo va bien, la promesa se satisface y devuelve el valor de id a usar
*
* @param id Parametro con el indice a validar
*/
const validateId = id => {
  return new Sequelize.Promise((resolve, reject) => {
    if (typeof id === "undefined") {
      reject(new Error(`Falta el parámetro <id>.`));
    } else {
      id = parseInt(id);
      if (Number.isNaN(id)) {
        reject(new Error(`El valor del parámetro <id> no es un número`));
      } else {
        resolve(id);
      }
    }
  });
};

/**
* Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a mostrar.
*/
exports.showCmd = (rl, id) => {
  validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
      if (!quiz) {
        throw new Error(`No exite un quiz asociado al id = ${id}`);
      }
      log(`[${colorize(id, "magenta")}]: ${quiz.question} ${colorize("=>", "magenta")} ${quiz.answer}`);
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() => {
      rl.prompt();
    })
};

/** Esta función convierte la llamada rl.question, que está basada en callbacks, en una función
* basada en promesas.
*
* Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido
* Entonces la llamada a then que hay que hacer la promesa devuelta será:
*      .then(answer => {...})
*
* También colorea en rojo el texto de la pregunta, elimina espacios al princpio y al final
* 
* @param rl Objeto readline usado para implementar el CLI
* @param text Pregunta que hay que hacerle al usuario
*/
const makeQuestion = (rl, text) => {
  return new Sequelize.Promise((resolve, reject) => {
    rl.question(colorize(text, "red"), answer => {
      resolve(answer.trim());
    });
  });
};

/**
* Añade un nuevo quiz al modelo.
* Pregunta interactivamente por la pregunta y por la respuesta.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.addCmd = (rl, id) => {
  makeQuestion(rl, "Introduzca una pregunta: ")
    .then(q => {
      return makeQuestion(rl, "Introduzca la respuesta: ")
        .then(a => {
          return { question: q, answer: a };
        });
    })
    .then(quiz => {
      return models.quiz.create(quiz);
    })
    .then(quiz => {
      log(`${colorize("Se ha añadido", "magenta")}: ${quiz.question} ${colorize("=>", "magenta")} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
      errorlog("El quiz es erróneo: ");
      error.errors.forEach(({ message }) => errorlog(message));
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

/**
* Borra un quiz del modelo.
* 
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a borrar en el modelo.
*/
exports.deleteCmd = (rl, id) => {
  validateId(id)
    .then(id => models.quiz.destroy({ where: { id } }))
    .catch(error => {
      errorlog(error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

/**
* Edita un quiz del modelo.
* 
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a borrar en el modelo.
*/
exports.editCmd = (rl, id) => {
  validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
      if (!quiz) {
        throw new Error(`No existe un quiz asociado al id = ${id}`);
      }
      process.stdout.isTTY && setTimeout(() => { rl.write(quiz.question) }, 0);
      return makeQuestion(rl, "Introduzca una pregunta: ")
        .then(q => {
          process.stdout.isTTY && setTimeout(() => { rl.write(quiz.question) }, 0);
          return makeQuestion(rl, "Introduzca la respuesta: ")
            .then(a => {
              quiz.question = q;
              quiz.answer = a;
              return quiz;
            });
        });
    })
    .then(quiz => {
      return quiz.save();
    })
    .then(quiz => {
      log(`Se ha cambiado el quiz ${colorize(quiz.id, "magenta")} por: ${quiz.question} ${colorize("=>", "magenta")} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
      errorlog("El quiz es erróneo: ");
      error.errors.forEach(({ message }) => errorlog(message));
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

/**
* Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
* 
* @param rl Objeto readline usado para implementar el CLI.
* @param id Clave del quiz a borrar en el modelo.
*/ 
exports.testCmd = (rl, id) => {
  validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
      if (!quiz) {
        throw new Error(`No existe un quiz asociado al id = ${id}`);
      }
      return makeQuestion(rl, quiz.question)
        .then(a => {
          if (a.toLowerCase().trim() == quiz.answer.toLowerCase().trim()) {
            log("Su respuesta es:", "blue");
            log("correcta", "green");
          } else {
            log("Su respuesta es:", "blue");
            log("incorrecta", "red");
          }
        });
    })
    .catch(Sequelize.ValidationError, error => {
      errorlog("El quiz es erróneo: ");
      error.errors.forEach(({ message }) => errorlog(message));
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() => {
      rl.prompt();
    });
};

/**
* Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
* Se gana si se contesta a todos satisfactoriamente.
*
* @param rl Objeto readline usado para implementar el CLI.
*/ 
exports.playCmd = rl => {
  let score = 0;
  let toBeResolved = new Array();
  models.quiz.findAll()
    .then(quizzes => {
      quizzes.forEach((quiz, id) => {
        toBeResolved[id] = quiz;
      });
      const jugar = () => {
        if (toBeResolved.length === 0) {
          log(`Fin. Has ganado. Preguntas acertadas: ${colorize(score, "yellow")}`, "green");
          rl.prompt();
        } else {
          var azar = Math.floor(Math.random() * toBeResolved.length);
          let quiz = toBeResolved[azar];
          toBeResolved.splice(azar, 1);
          return makeQuestion(rl, quiz.question)
            .then(a => {
              if (a.toLowerCase().trim() == quiz.answer.toLowerCase().trim()) {
                score++;
                log("Su respuesta es:", "blue");
                log("Correcta", "green");
                log(`Preguntas acertadas: ${colorize(score, "yellow")}`, "green");
                jugar();
              } else {
                log("Su respuesta es:", "blue");
                log("Incorrecta", "red");
                log(`Fin. Has perdido. Preguntas acertadas: ${colorize(score, "yellow")}`, "green");
                rl.prompt();
              }
            })
            .catch(Sequelize.ValidationError, error => {
              errorlog("El quiz es erróneo: ");
              error.errors.forEach(({ message }) => errorlog(message));
            })
            .catch(error => {
              errorlog(error.message);
            })
            .then(() => {
              rl.prompt();
            });
        }
      }
      jugar();
    });
};

/**
* Muestra los nombres de los autores de la práctica.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.creditsCmd = rl => {
  log("Autores de la práctica: ");
  log("Jorge Ubeda Romero");
  log("Maria Belen Delgado Dominguez");
  rl.prompt();
};

/**
* Terminar el programa.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.quitCmd = rl => {
  rl.close();
  rl.prompt();
};