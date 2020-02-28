// import { errorMatch, warningMatch } from './util'
// import eventRouter from './eventRouter'
import uuid from 'uuid4'

let failureeventDetails

let validateInputs = false

const createFailedEvents = (event, eventConfig) => {
    const eventTimeUTC = new Date()
    return {
        id: uuid(),
        subject: eventConfig.eventSubject,
        data: event,
        eventType: eventConfig.eventType,
        eventTime: eventTimeUTC.toISOString(),
        dataVersion: '1.0'
    }
}

// 
// CloudEvent Example below. 
//
// {
//     specversion: "1.0",
//     type: "com.github.pull.create",
//     source: "https://github.com/cloudevents/spec/pull",
//     subject: "123",
//     id: "A234-1234-1234",
//     time: "2018-04-05T17:31:00Z",
//     datacontenttype : "text/xml",
//     data: "<much wow=\"xml\"/>"
// }

const eventRouterValidation = eventRouter => {
    const observe = []
    let validate = false
    try {
        const { name, subject, type, eventMap, evaluation } = eventRouter

        if (typeof name !== 'string') {
            throw new Error("eventRouter Validation Failed: Field 'name' is not a string")
        }

        if (typeof subject !== 'string') {
            throw new Error("eventRouter Validation Failed: Field 'subject' is not a string")
        }

        if (typeof type !== 'string') {
            throw new Error("eventRouter Validation Failed: Field 'type' is not a string")
        }

        if (typeof eventMap !== 'function') {
            throw new Error("eventRouter Validation Failed: Field 'eventMap' is not a function")
        }

        if (typeof evaluation !== 'function') {
            throw new Error("eventRouter Validation Failed: Field 'evaluation' is not a function")
        }
        validate = true
    } catch (error) {
        observe.push({
            eventTime: Date.now(),
            eventType: 'validationError',
            msgLevel: 'error',
            message: error,
            functionName: 'event-router/eventRouterValidation'
        })
        validate = false
    }
    return {
        validate,
        observe
    }
}

const eventEmitterValidation = (eventEmitters, eventRouter) => {
    const observe = []
    let validate = false
    try {
        if (typeof eventEmitters !== 'object') {
            throw new Error('eventEmitters is not an object!')
        }

        for (let eventEmitter in eventEmitters) {
            if (typeof eventEmitters[eventEmitter] !== 'function') {
                throw new Error(`eventEmitter ${eventEmitter} is not a function`)
            }
        }

        let numEventRouters = eventRouter.length

        for (let i = 0; i < numEventRouters; i++) {
            const eventName = eventRouter[i].name
            if (typeof eventEmitters[name] !== 'function') {
                throw new Error(`There are no valid emitters defined for route ${eventName}. Must be a function`)
            }
        }

        validate = true
    } catch (error) {
        observe.push({
            eventTime: Date.now(),
            eventType: 'validationError',
            msgLevel: 'error',
            message: error,
            functionName: 'event-router/eventEmitterValidation'
        })
        validate = false
    }
    return {
        validate,
        observe
    }
}

const handler = async ({ events, eventRouter, eventEmitters, logFailure }) => {
    const startTime = Date.now()
    let observe = []
    let failedEvents = []
    logFailure = typeof logFailure == 'boolean' ? logFailure : true // flag to indicate whether to log failed errors out or not, only used as last resort

    observe.push({
        eventTime: startTime,
        eventType: 'initFunction',
        msgLevel: 'info',
        functionName: 'event-router'
    })
    try {

        // validate eventRouter and eventEmitters on first invocation.
        if (!validateInputs) {
            const validateEventRouter = eventRouterValidation(eventRouter)
            observe.concat(validateEventRouter.observe)

            const validateEmitters = eventEmitterValidation(eventEmitters)
            observe.concat(validateEmitters.observe)

            validateInputs = validateEmitters.validate && validateEventRouter
        }

        // if inputs are valid, carry on processing
        if (validateInputs) {

            // Has a valid events object been passed to the function? This may be redundant...
            if (!!events && events.length > 0) {

                // iterate through the eventRouter ruleset
                for (let i = 0; i < eventRouter.length; i++) {
                    // create Array of events that match filter criteria for the eventRouter rule
                    const processEvents = events.filter(eventRouter[i].evaluation)

                    if (processEvents.length > 0) {
                        try {
                            const { subject, type, name } = eventRouter[
                                i
                            ]

                            // transform the document data based on the eventMap function for eventRouter rule
                            const eventMap = processEvents.map(event => {
                                return {
                                    subject,
                                    type,
                                    datacontenttype: 'application/json',
                                    id: uuid(),
                                    time: event.eventTime.toISOString(),
                                    data: JSON.stringify(eventRouter[i].eventMap(event))
                                }
                            })

                            const emitResponse = await eventEmitters[name].emitter(eventMap)

                            observe = observe.concat(emitResponse.observe)

                            // capture events that failed to be emitted, for retry later via a DLQ
                            failedEvents = failedEvents.concat(emitResponse.failedEvents)

                        } catch (error) {
                            // if stack error during eventRouter loop, capture warning and push all events to failed events array
                            observe.push({
                                eventTime: Date.now(),
                                eventType: 'emitError',
                                msgLevel: 'warning',
                                message: error.message,
                                stack: error.stack,
                                eventRouter: eventRouter[i],
                                functionName: 'event-router'
                            })
                            failedEvents = failedEvents.concat(processEvents)
                        }
                    }
                }
            } else {
                observe.push({
                    eventTime: Date.now(),
                    eventType: 'validationError',
                    msgLevel: 'error',
                    message: `Unable to process array.`,
                    events,
                    functionName: 'event-router'
                })
            }

            // check if there are failed events and emit to a separate DLQ
            if (failedEvents.length > 0) {
                if (typeof eventEmitters.dlq == 'function') {
                    const failureResponse = await eventEmitters['dlq'].emitter(
                        failedEvents
                    )
                    observe = observe.concat(failureResponse.observe)

                    // if events are successfully emitted to DLQ, then don't log out
                    if (failureResponse.failedEvents.length > 0) {
                        if (logFailure) {
                            console.log(JSON.stringify(failureResponse.failedEvents, '', 2))
                        }
                    }
                } else {
                    if (logFailure) {
                        console.log(JSON.stringify(failedEvents, '', 2))
                    }
                }
            }
        }
    } catch (error) {
        observe.push({
            eventTime: Date.now(),
            eventType: 'stackError',
            msgLevel: 'error',
            message: error.message,
            stack: error.stack,
            functionName: 'event-router'
        })
    } finally {
        const endTime = Date.now()
        observe.push({
            eventTime: endTime,
            eventType: 'endFunction',
            msgLevel: 'info',
            duration: endTime - startTime,
            functionName: 'event-router'
        })
    }

    // if (logFailure) {
    //     context.log(`Failed Events:\n ${JSON.stringify(failedEvents, '', 2)}`)
    // }
    // if (errorMatch(observe)) {
    //     context.done(JSON.stringify(observe, '', 2))
    // } else {
    //     if (warningMatch(observe)) {
    //         context.done(JSON.stringify(observe, '', 2))
    //     } else {
    //         context.done()
    //     }
    // }
}

export default handler
