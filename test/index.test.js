import eventEmitter from './testFunc/eventEmitter.js'

const logFailedEvent = event => {
    // console.log(event)
    return {
        observe: {
            message: "This didn't work",
            payload: event
        },
        response: false
    }
}

const logSuccessEvent = event => {
    // console.log(event)
    return {
        observe: {
            message: 'This worked',
            payload: event
        },
        response: true
    }
}

const basicTest = async () => {


    const testEmitter = new eventEmitter(logEvent)

    const testTime = new Date()

    const testPayload = {
        name: "bob",
        email: "bob@jones.com"
    }

    const testEvent = [{
        subject: 'testSubject',
        type: 'update',
        datacontenttype: 'application/json',
        id: '1234',
        time: testTime.toISOString(),
        data: JSON.stringify(testPayload)
    }]

    const response = await testEmitter.emitter(testEvent)

    const { observe, failedEvents } = response

    //console.log(observe)

    console.log(failedEvents)
    return response
}

basicTest()