let router = require('express').Router(); 

router.get('/shirts', (request, answer) => {
    answer.send('셔츠를 파는 페이지');
});

router.get('/pants', (request, answer) => {
    answer.send('바지를 파는 페이지');
});

module.exports = router; 
